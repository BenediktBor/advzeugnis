import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireTemplateManagerOrAdmin } from './lib/auth'
import { validateTemplateId } from './lib/templateValidation'

const PRESENCE_TTL_MS = 45_000

export const heartbeat = mutation({
	args: { templateId: v.string() },
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		validateTemplateId(args.templateId)
		const now = Date.now()

		const existing = await ctx.db
			.query('templateEditorPresence')
			.withIndex('by_school_template_user', (q) =>
				q.eq('schoolId', membership.schoolId).eq('templateId', args.templateId).eq('userId', userId),
			)
			.unique()

		if (existing) {
			await ctx.db.patch(existing._id, { lastSeenAt: now })
			return
		}

		await ctx.db.insert('templateEditorPresence', {
			schoolId: membership.schoolId,
			templateId: args.templateId,
			userId,
			lastSeenAt: now,
		})
	},
})

export const listActive = query({
	args: { templateId: v.string() },
	handler: async (ctx, args) => {
		const { userId, membership } = await requireTemplateManagerOrAdmin(ctx)
		validateTemplateId(args.templateId)
		const cutoff = Date.now() - PRESENCE_TTL_MS

		const rows = await ctx.db
			.query('templateEditorPresence')
			.withIndex('by_school_template', (q) =>
				q.eq('schoolId', membership.schoolId).eq('templateId', args.templateId),
			)
			.collect()

		const activeEditors = []
		for (const row of rows) {
			if (row.userId === userId) continue
			if (row.lastSeenAt <= cutoff) continue
			const user = await ctx.db.get(row.userId)
			activeEditors.push({
				userId: row.userId,
				displayName: user?.name ?? user?.email ?? 'Benutzer',
				image: user?.image,
				lastSeenAt: row.lastSeenAt,
			})
		}

		return activeEditors
	},
})
