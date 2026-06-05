import { ConvexError, v } from 'convex/values'
import { StripeSubscriptions } from '@convex-dev/stripe'
import { action, internalMutation, mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { getActiveMembershipForUser, requireUser } from './lib/auth'
import { api, components, internal } from './_generated/api'

const stripeClient = new StripeSubscriptions(components.stripe as any, {})

function normalizeEmail(email: string) {
	return email.trim().toLowerCase()
}

export const viewer = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx)
		if (!userId) return null

		const user = await ctx.db.get(userId)
		if (!user) return null

		const membership = await getActiveMembershipForUser(ctx, userId)
		const school = membership ? await ctx.db.get(membership.schoolId) : null

		return {
			id: userId,
			displayName: user.name ?? user.email ?? 'Benutzer',
			email: user.email,
			image: user.image,
			school: school && membership
				? {
						id: school._id,
						name: school.name,
						role: membership.role,
						subscriptionStatus: school.subscriptionStatus,
						seatLimit: school.seatLimit,
					}
				: null,
		}
	},
})

export const cleanupStalePasswordAccount = mutation({
	args: { email: v.string() },
	handler: async (ctx, args) => {
		const email = normalizeEmail(args.email)
		const account = await ctx.db
			.query('authAccounts')
			.withIndex('providerAndAccountId', (q) => q.eq('provider', 'password').eq('providerAccountId', email))
			.unique()
		if (!account) return false

		const user = await ctx.db.get(account.userId)
		if (user) return false

		const verificationCodes = await ctx.db
			.query('authVerificationCodes')
			.withIndex('accountId', (q) => q.eq('accountId', account._id))
			.collect()
		for (const code of verificationCodes) await ctx.db.delete(code._id)

		const sessions = await ctx.db
			.query('authSessions')
			.withIndex('userId', (q) => q.eq('userId', account.userId))
			.collect()
		for (const session of sessions) {
			const refreshTokens = await ctx.db
				.query('authRefreshTokens')
				.withIndex('sessionId', (q) => q.eq('sessionId', session._id))
				.collect()
			for (const refreshToken of refreshTokens) await ctx.db.delete(refreshToken._id)
			await ctx.db.delete(session._id)
		}

		await ctx.db.delete(account._id)
		return true
	},
})

export const deletionPreview = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.collect()
		const activeMembership = memberships.find((membership) => membership.status === 'active') ?? null
		const school = activeMembership ? await ctx.db.get(activeMembership.schoolId) : null
		return {
			ownsSchool: school?.createdBy === userId,
			stripeSubscriptionId: school?.createdBy === userId ? school.stripeSubscriptionId : undefined,
			subscriptionStatus: school?.createdBy === userId ? school.subscriptionStatus : undefined,
		}
	},
})

export const deleteCurrentAccount = action({
	args: {},
	handler: async (ctx): Promise<void> => {
		const preview = await ctx.runQuery(api.users.deletionPreview) as {
			ownsSchool: boolean
			stripeSubscriptionId?: string
			subscriptionStatus?: string
		}

		if (
			preview.ownsSchool &&
			preview.stripeSubscriptionId &&
			preview.subscriptionStatus &&
			preview.subscriptionStatus !== 'canceled'
		) {
			await stripeClient.cancelSubscription(ctx, {
				stripeSubscriptionId: preview.stripeSubscriptionId,
				cancelAtPeriodEnd: false,
			})
		}

		await ctx.runMutation(internal.users.deleteCurrentAccountData)
	},
})

export const deleteCurrentAccountData = internalMutation({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.collect()
		const activeMembership = memberships.find((membership) => membership.status === 'active') ?? null

		if (activeMembership) {
			const school = await ctx.db.get(activeMembership.schoolId)
			if (school?.createdBy === userId && school.stripeSubscriptionId && school.subscriptionStatus !== 'canceled') {
				throw new ConvexError('Cancel the active school subscription before deleting this account')
			}
			const schoolMemberships = await ctx.db
				.query('memberships')
				.withIndex('by_school', (q) => q.eq('schoolId', activeMembership.schoolId))
				.collect()
			const otherActiveMembers = schoolMemberships.filter(
				(membership) => membership.status === 'active' && membership.userId !== userId,
			)

			if ((activeMembership.role === 'owner' || school?.createdBy === userId) && otherActiveMembers.length > 0) {
				throw new ConvexError('Transfer ownership or remove other school members before deleting this owner account')
			}

			if (school?.createdBy === userId && otherActiveMembers.length === 0) {
				const [invites, templateSets] = await Promise.all([
					ctx.db.query('invites').withIndex('by_school', (q) => q.eq('schoolId', activeMembership.schoolId)).collect(),
					ctx.db.query('templateSets').withIndex('by_school', (q) => q.eq('schoolId', activeMembership.schoolId)).collect(),
				])
				for (const invite of invites) await ctx.db.delete(invite._id)
				for (const set of templateSets) await ctx.db.delete(set._id)
				for (const membership of schoolMemberships) await ctx.db.delete(membership._id)
				await ctx.db.delete(activeMembership.schoolId)
			} else {
				await ctx.db.patch(activeMembership._id, {
					status: 'removed',
					removedAt: Date.now(),
				})
			}
		}

		const allMemberships = await ctx.db.query('memberships').collect()
		for (const membership of allMemberships) {
			if (membership.invitedBy === userId) await ctx.db.patch(membership._id, { invitedBy: undefined })
		}
		const allInvites = await ctx.db.query('invites').collect()
		for (const invite of allInvites) {
			if (invite.invitedBy === userId) await ctx.db.delete(invite._id)
		}

		const accounts = await ctx.db
			.query('authAccounts')
			.withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
			.collect()
		for (const account of accounts) {
			const verificationCodes = await ctx.db
				.query('authVerificationCodes')
				.withIndex('accountId', (q) => q.eq('accountId', account._id))
				.collect()
			for (const code of verificationCodes) await ctx.db.delete(code._id)
			await ctx.db.delete(account._id)
		}

		const sessions = await ctx.db
			.query('authSessions')
			.withIndex('userId', (q) => q.eq('userId', userId))
			.collect()
		for (const session of sessions) {
			const refreshTokens = await ctx.db
				.query('authRefreshTokens')
				.withIndex('sessionId', (q) => q.eq('sessionId', session._id))
				.collect()
			for (const refreshToken of refreshTokens) await ctx.db.delete(refreshToken._id)
			await ctx.db.delete(session._id)
		}

		await ctx.db.delete(userId)
	},
})
