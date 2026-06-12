import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { getActiveMembershipForUser, requireTemplateManagerOrAdmin, requireUser } from './lib/auth'
import { templateDataValidator } from './schema'
import {
	validateTemplateId,
	validateTemplateInput,
	validateTemplateSetLimit,
} from './lib/templateValidation'
import { migrateLegacyTemplateData } from './lib/templateMigration'
import {
	canSeeHiddenTemplates,
	filterTemplateSetForRole,
	summarizeVisibleSubjects,
	type TemplateSetData,
} from './lib/templateVisibility'

async function getCurrentMembership(ctx: Parameters<typeof requireUser>[0]) {
	const userId = await getAuthUserId(ctx)
	if (!userId) return null
	return await getActiveMembershipForUser(ctx, userId)
}

export const listSummary = query({
	args: {},
	handler: async (ctx) => {
		const membership = await getCurrentMembership(ctx)
		if (!membership) return []

		const rows = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()

		const role = membership.role
		return rows
			.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
			.filter((row) => canSeeHiddenTemplates(role) || !row.data.hidden)
			.map((row) => ({
				id: row.templateId,
				label: row.label,
				sortOrder: row.sortOrder,
				updatedAt: row.updatedAt,
				updatedBy: row.updatedBy,
				...(canSeeHiddenTemplates(role) ? { hidden: Boolean(row.data.hidden) } : {}),
				...summarizeVisibleSubjects(row.data as TemplateSetData, role),
			}))
	},
})

export const get = query({
	args: { templateId: v.string() },
	handler: async (ctx, args) => {
		const membership = await getCurrentMembership(ctx)
		if (!membership) return null
		validateTemplateId(args.templateId)
		const row = await ctx.db
			.query('templateSets')
			.withIndex('by_school_template', (q) => q.eq('schoolId', membership.schoolId).eq('templateId', args.templateId))
			.unique()
		if (!row) return null
		const filteredData = filterTemplateSetForRole(row.data as TemplateSetData, membership.role)
		if (!filteredData) return null
		return {
			id: row.templateId,
			label: row.label,
			data: filteredData,
			sortOrder: row.sortOrder,
			updatedAt: row.updatedAt,
			updatedBy: row.updatedBy,
		}
	},
})

export const list = query({
	args: {},
	handler: async (ctx) => {
		const membership = await getCurrentMembership(ctx)
		if (!membership) return []

		const rows = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()

		const role = membership.role
		return rows
			.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
			.map((row) => {
				const filteredData = filterTemplateSetForRole(row.data as TemplateSetData, role)
				if (!filteredData) return null
				return {
					id: row.templateId,
					label: row.label,
					data: filteredData,
					sortOrder: row.sortOrder,
					updatedAt: row.updatedAt,
					updatedBy: row.updatedBy,
				}
			})
			.filter((row): row is NonNullable<typeof row> => row !== null)
	},
})

function assertNoTemplateConflict(
	existing: { updatedAt: number },
	expectedUpdatedAt: number | undefined,
	force: boolean | undefined,
) {
	if (
		!force &&
		expectedUpdatedAt !== undefined &&
		existing.updatedAt !== expectedUpdatedAt
	) {
		throw new ConvexError('TEMPLATE_CONFLICT')
	}
}

export const upsert = mutation({
	args: {
		templateId: v.string(),
		label: v.string(),
		data: templateDataValidator,
		sortOrder: v.optional(v.number()),
		expectedUpdatedAt: v.optional(v.number()),
		force: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		validateTemplateInput(args)
		const existing = await ctx.db
			.query('templateSets')
			.withIndex('by_school_template', (q) => q.eq('schoolId', membership.schoolId).eq('templateId', args.templateId))
			.unique()

		const now = Date.now()
		if (existing) {
			assertNoTemplateConflict(existing, args.expectedUpdatedAt, args.force)
			await ctx.db.patch(existing._id, {
				label: args.label,
				data: args.data,
				sortOrder: args.sortOrder ?? existing.sortOrder,
				updatedBy: userId,
				updatedAt: now,
			})
			return {
				templateId: args.templateId,
				updatedAt: now,
				updatedBy: userId,
			}
		}

		const current = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		validateTemplateSetLimit(current.length + 1)
		await ctx.db.insert('templateSets', {
			schoolId: membership.schoolId,
			templateId: args.templateId,
			label: args.label,
			data: args.data,
			sortOrder: args.sortOrder ?? current.length,
			updatedBy: userId,
			updatedAt: now,
		})
		return {
			templateId: args.templateId,
			updatedAt: now,
			updatedBy: userId,
		}
	},
})

export const upsertMany = mutation({
	args: {
		sets: v.array(v.object({
			templateId: v.string(),
			label: v.string(),
			data: templateDataValidator,
			sortOrder: v.number(),
			expectedUpdatedAt: v.optional(v.number()),
		})),
		force: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		const now = Date.now()
		const templateIds = new Set<string>()
		for (const set of args.sets) {
			validateTemplateInput(set)
			if (templateIds.has(set.templateId)) throw new ConvexError('Duplicate templateId in bulk upsert')
			templateIds.add(set.templateId)
		}
		const current = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		const existingByTemplateId = new Map(current.map((row) => [row.templateId, row]))
		const newSetCount = args.sets.filter((set) => !existingByTemplateId.has(set.templateId)).length
		validateTemplateSetLimit(current.length + newSetCount)

		for (const set of args.sets) {
			const existing = existingByTemplateId.get(set.templateId)
			if (existing) {
				assertNoTemplateConflict(existing, set.expectedUpdatedAt, args.force)
				await ctx.db.patch(existing._id, {
					label: set.label,
					data: set.data,
					sortOrder: set.sortOrder,
					updatedBy: userId,
					updatedAt: now,
				})
			} else {
				await ctx.db.insert('templateSets', {
					schoolId: membership.schoolId,
					templateId: set.templateId,
					label: set.label,
					data: set.data,
					sortOrder: set.sortOrder,
					updatedBy: userId,
					updatedAt: now,
				})
			}
		}
		return args.sets.length
	},
})

export const repairLegacyData = mutation({
	args: {},
	handler: async (ctx) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		const rows = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		const usedTemplateIds = new Set<string>()
		let repaired = 0
		const now = Date.now()

		for (const row of rows) {
			let data = migrateLegacyTemplateData(row.data, row.templateId, row.label)
			if (!data) continue
			if (usedTemplateIds.has(data.id)) {
				data = { ...data, id: crypto.randomUUID() }
			}
			usedTemplateIds.add(data.id)
			validateTemplateInput({ templateId: data.id, label: data.label, data })
			if (
				row.templateId === data.id &&
				row.label === data.label &&
				JSON.stringify(row.data) === JSON.stringify(data)
			) {
				continue
			}

			await ctx.db.patch(row._id, {
				templateId: data.id,
				label: data.label,
				data,
				updatedBy: userId,
				updatedAt: now,
			})
			repaired += 1
		}
		return repaired
	},
})

export const remove = mutation({
	args: { templateId: v.string() },
	handler: async (ctx, args) => {
		const { membership } = await requireTemplateManagerOrAdmin(ctx)
		validateTemplateId(args.templateId)
		const existing = await ctx.db
			.query('templateSets')
			.withIndex('by_school_template', (q) => q.eq('schoolId', membership.schoolId).eq('templateId', args.templateId))
			.unique()
		if (!existing) throw new ConvexError('Template set not found')
		await ctx.db.delete(existing._id)
	},
})

export const reorder = mutation({
	args: { orderedIds: v.array(v.string()) },
	handler: async (ctx, args) => {
		const { membership } = await requireTemplateManagerOrAdmin(ctx)
		const seen = new Set<string>()
		for (const templateId of args.orderedIds) {
			validateTemplateId(templateId)
			if (seen.has(templateId)) throw new ConvexError('Duplicate templateId in reorder')
			seen.add(templateId)
		}
		const rows = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		const byTemplateId = new Map(rows.map((row) => [row.templateId, row]))
		for (const [index, templateId] of args.orderedIds.entries()) {
			const row = byTemplateId.get(templateId)
			if (!row) throw new ConvexError('Template set not found')
			await ctx.db.patch(row._id, { sortOrder: index })
		}
	},
})
