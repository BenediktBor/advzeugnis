import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getActiveMembershipForUser, requireTemplateManagerOrAdmin, requireUser } from './lib/auth'
import { templateDataValidator } from './schema'
import {
	validateTemplateId,
	validateTemplateInput,
	validateTemplateSetLimit,
} from './lib/templateValidation'
import { migrateLegacyTemplateData } from './lib/templateMigration'

function summarizeTemplateData(data: {
	subjects: Array<{
		label: string
		categories: Array<{
			grades: Array<{
				variants: unknown[]
			}>
		}>
	}>
}) {
	const subjectLabels = data.subjects.map((subject) => subject.label)
	const categoryCount = data.subjects.reduce(
		(total, subject) => total + subject.categories.length,
		0,
	)
	const gradeCount = data.subjects.reduce(
		(total, subject) =>
			total +
			subject.categories.reduce(
				(categoryTotal, category) => categoryTotal + category.grades.length,
				0,
			),
		0,
	)
	const variantCount = data.subjects.reduce(
		(total, subject) =>
			total +
			subject.categories.reduce(
				(categoryTotal, category) =>
					categoryTotal +
					category.grades.reduce(
						(gradeTotal, grade) => gradeTotal + grade.variants.length,
						0,
					),
				0,
			),
		0,
	)

	return {
		subjects: subjectLabels,
		subjectPreview: subjectLabels.slice(0, 4),
		remainingSubjectCount: Math.max(0, subjectLabels.length - 4),
		subjectCount: subjectLabels.length,
		categoryCount,
		gradeCount,
		variantCount,
	}
}

async function getCurrentMembership(ctx: Parameters<typeof requireUser>[0]) {
	const { userId } = await requireUser(ctx)
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

		return rows
			.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
			.map((row) => ({
				id: row.templateId,
				label: row.label,
				sortOrder: row.sortOrder,
				updatedAt: row.updatedAt,
				updatedBy: row.updatedBy,
				...summarizeTemplateData(row.data),
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
		return {
			id: row.templateId,
			label: row.label,
			data: row.data,
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

		return rows
			.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
			.map((row) => ({
				id: row.templateId,
				label: row.label,
				data: row.data,
				sortOrder: row.sortOrder,
				updatedAt: row.updatedAt,
				updatedBy: row.updatedBy,
			}))
	},
})

export const upsert = mutation({
	args: {
		templateId: v.string(),
		label: v.string(),
		data: templateDataValidator,
		sortOrder: v.optional(v.number()),
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
			await ctx.db.patch(existing._id, {
				label: args.label,
				data: args.data,
				sortOrder: args.sortOrder ?? existing.sortOrder,
				updatedBy: userId,
				updatedAt: now,
			})
			return existing._id
		}

		const current = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		validateTemplateSetLimit(current.length + 1)
		return await ctx.db.insert('templateSets', {
			schoolId: membership.schoolId,
			templateId: args.templateId,
			label: args.label,
			data: args.data,
			sortOrder: args.sortOrder ?? current.length,
			updatedBy: userId,
			updatedAt: now,
		})
	},
})

export const upsertMany = mutation({
	args: {
		sets: v.array(v.object({
			templateId: v.string(),
			label: v.string(),
			data: templateDataValidator,
			sortOrder: v.number(),
		})),
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
