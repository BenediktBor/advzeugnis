import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getActiveMembershipForUser, requireTemplateManagerOrAdmin, requireUser } from './lib/auth'

export const list = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const membership = await getActiveMembershipForUser(ctx, userId)
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
		data: v.any(),
		sortOrder: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
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
			data: v.any(),
			sortOrder: v.number(),
		})),
	},
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		const now = Date.now()
		for (const set of args.sets) {
			const existing = await ctx.db
				.query('templateSets')
				.withIndex('by_school_template', (q) => q.eq('schoolId', membership.schoolId).eq('templateId', set.templateId))
				.unique()
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

export const remove = mutation({
	args: { templateId: v.string() },
	handler: async (ctx, args) => {
		const { membership } = await requireTemplateManagerOrAdmin(ctx)
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
		const rows = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()
		const byTemplateId = new Map(rows.map((row) => [row.templateId, row]))
		for (const [index, templateId] of args.orderedIds.entries()) {
			const row = byTemplateId.get(templateId)
			if (row) await ctx.db.patch(row._id, { sortOrder: index })
		}
	},
})
