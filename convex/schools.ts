import { ConvexError, v } from 'convex/values'
import { action, internalMutation, mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { assignableSchoolRoleValidator } from './schema'
import {
	getActiveMembershipForUser,
	hasActiveSubscription,
	requireActiveSubscription,
	requireAdmin,
	requireOwner,
	requireUser,
} from './lib/auth'
import { api } from './_generated/api'
import { sendResendEmail } from './ResendOTP'

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14
const DEFAULT_SEAT_LIMIT = 1

function normalizeEmail(email: string) {
	return email.trim().toLowerCase()
}

async function countActiveMembers(ctx: Parameters<typeof requireAdmin>[0], schoolId: Id<'schools'>) {
	const memberships = await ctx.db
		.query('memberships')
		.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
		.collect()
	return memberships.filter((membership) => membership.status === 'active').length
}

export const current = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const membership = await getActiveMembershipForUser(ctx, userId)
		if (!membership) return null

		const school = await ctx.db.get(membership.schoolId)
		if (!school) return null

		return {
			id: school._id,
			name: school.name,
			role: school.createdBy === userId ? 'owner' : membership.role,
			subscriptionStatus: school.subscriptionStatus,
			seatLimit: school.seatLimit,
			stripeCustomerId: school.stripeCustomerId,
			stripeSubscriptionId: school.stripeSubscriptionId,
		}
	},
})

export const members = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const membership = await getActiveMembershipForUser(ctx, userId)
		if (!membership) return []
		const school = await ctx.db.get(membership.schoolId)
		if (!school) return []
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()

		const rows = await Promise.all(
			memberships
				.filter((row) => row.status === 'active')
				.map(async (row) => {
					const user = await ctx.db.get(row.userId)
					return {
						id: row.userId,
						membershipId: row._id,
						displayName: user?.name ?? user?.email ?? 'Benutzer',
						email: user?.email,
						role: row.userId === school.createdBy ? 'owner' : row.role,
					}
				}),
		)

		return rows.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de', { sensitivity: 'base' }))
	},
})

export const invites = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const membership = await getActiveMembershipForUser(ctx, userId)
		if (!membership) return []
		if (membership.role !== 'owner' && membership.role !== 'admin') return []
		const rows = await ctx.db
			.query('invites')
			.withIndex('by_school', (q) => q.eq('schoolId', membership.schoolId))
			.collect()

		return rows
			.filter((invite) => invite.status === 'pending')
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((invite) => ({
				id: invite._id,
				email: invite.email,
				role: invite.role,
				expiresAt: invite.expiresAt,
				token: invite.token,
			}))
	},
})

export const billingContext = query({
	args: {},
	handler: async (ctx) => {
		const { userId, user, membership, school } = await requireAdmin(ctx)
		return {
			userId,
			email: user.email,
			name: user.name,
			schoolId: membership.schoolId,
			schoolName: school.name,
			stripeCustomerId: school.stripeCustomerId,
			stripeSubscriptionId: school.stripeSubscriptionId,
			seatLimit: school.seatLimit,
			subscriptionStatus: school.subscriptionStatus,
		}
	},
})

export const createSchool = mutation({
	args: {
		name: v.string(),
		seatLimit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireUser(ctx)
		const existingMembership = await getActiveMembershipForUser(ctx, userId)
		if (existingMembership) throw new ConvexError('Users can only belong to one school')

		const now = Date.now()
		const schoolId = await ctx.db.insert('schools', {
			name: args.name.trim() || 'Neue Schule',
			createdBy: userId,
			subscriptionStatus: 'checkoutPending',
			seatLimit: Math.max(DEFAULT_SEAT_LIMIT, Math.floor(args.seatLimit ?? DEFAULT_SEAT_LIMIT)),
		})

		await ctx.db.insert('memberships', {
			userId,
			schoolId,
			role: 'owner',
			status: 'active',
			createdAt: now,
		})

		return schoolId
	},
})

export const inviteUser = mutation({
	args: {
		email: v.string(),
		role: assignableSchoolRoleValidator,
	},
	handler: async (ctx, args) => {
		const { userId, membership, school } = await requireActiveSubscription(ctx)
		const email = normalizeEmail(args.email)
		if (!email) throw new ConvexError('Email is required')

		const activeMemberCount = await countActiveMembers(ctx, membership.schoolId)
		if (activeMemberCount >= school.seatLimit) throw new ConvexError('No seats available')

		const existing = await ctx.db
			.query('invites')
			.withIndex('by_school_email', (q) => q.eq('schoolId', membership.schoolId).eq('email', email))
			.collect()
		for (const invite of existing) {
			if (invite.status === 'pending') await ctx.db.patch(invite._id, { status: 'revoked' })
		}

		const token = crypto.randomUUID()
		const inviteId = await ctx.db.insert('invites', {
			schoolId: membership.schoolId,
			email,
			role: args.role,
			token,
			status: 'pending',
			invitedBy: userId,
			createdAt: Date.now(),
			expiresAt: Date.now() + INVITE_TTL_MS,
		})

		return { inviteId, token }
	},
})

export const inviteUserWithEmail = action({
	args: {
		email: v.string(),
		role: assignableSchoolRoleValidator,
		siteUrl: v.string(),
	},
	handler: async (ctx, args): Promise<{
		inviteId: Id<'invites'>
		token: string
		inviteUrl: string
		emailSent: boolean
		emailId?: string
		emailError?: string
	}> => {
		const invite = await ctx.runMutation(api.schools.inviteUser, {
			email: args.email,
			role: args.role,
		}) as { inviteId: Id<'invites'>, token: string }
		const siteUrl = args.siteUrl.replace(/\/$/, '')
		const inviteUrl = `${siteUrl}/invite/${invite.token}`

		try {
			const email = await sendResendEmail({
				to: normalizeEmail(args.email),
				subject: 'Einladung zu AdvancedZeugnis',
				text: [
					'Du wurdest zu AdvancedZeugnis eingeladen.',
					'',
					'Öffne diesen Link, um dein Konto zu erstellen und der Schule beizutreten:',
					inviteUrl,
					'',
					'Der Link ist 14 Tage gueltig.',
				].join('\n'),
			})
			console.info(`[school] invite email sent to ${normalizeEmail(args.email)} (${email.id ?? 'unknown id'})`)
			return { ...invite, inviteUrl, emailSent: true, emailId: email.id }
		} catch (err) {
			const emailError = err instanceof Error ? err.message : String(err)
			console.error(`[school] invite email failed for ${normalizeEmail(args.email)}:`, emailError)
			return { ...invite, inviteUrl, emailSent: false, emailError }
		}

	},
})

export const revokeInvite = mutation({
	args: { inviteId: v.id('invites') },
	handler: async (ctx, args) => {
		const { membership } = await requireAdmin(ctx)
		const invite = await ctx.db.get(args.inviteId)
		if (!invite || invite.schoolId !== membership.schoolId) throw new ConvexError('Invite not found')
		await ctx.db.patch(args.inviteId, { status: 'revoked' })
	},
})

export const acceptInvite = mutation({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const { userId, user } = await requireUser(ctx)
		const existingMembership = await getActiveMembershipForUser(ctx, userId)
		if (existingMembership) throw new ConvexError('Users can only belong to one school')

		const invite = await ctx.db
			.query('invites')
			.withIndex('by_token', (q) => q.eq('token', args.token))
			.unique()
		if (!invite || invite.status !== 'pending') throw new ConvexError('Invite not found')
		if (invite.expiresAt < Date.now()) {
			await ctx.db.patch(invite._id, { status: 'expired' })
			throw new ConvexError('Invite has expired')
		}
		if (user.email && normalizeEmail(user.email) !== invite.email) {
			throw new ConvexError('Invite email does not match signed-in user')
		}

		const school = await ctx.db.get(invite.schoolId)
		if (!school || !hasActiveSubscription(school)) throw new ConvexError('School subscription is not active')
		const activeMemberCount = await countActiveMembers(ctx, invite.schoolId)
		if (activeMemberCount >= school.seatLimit) throw new ConvexError('No seats available')

		await ctx.db.insert('memberships', {
			userId,
			schoolId: invite.schoolId,
			role: invite.role,
			status: 'active',
			invitedBy: invite.invitedBy,
			createdAt: Date.now(),
		})
		await ctx.db.patch(invite._id, {
			status: 'accepted',
			invitedUserId: userId,
			acceptedAt: Date.now(),
		})

		return invite.schoolId
	},
})

export const removeMember = mutation({
	args: { userId: v.id('users') },
	handler: async (ctx, args) => {
		const { userId, membership } = await requireAdmin(ctx)
		if (args.userId === userId) throw new ConvexError('Admins cannot remove themselves')

		const member = await ctx.db
			.query('memberships')
			.withIndex('by_school_user', (q) => q.eq('schoolId', membership.schoolId).eq('userId', args.userId))
			.unique()
		if (!member || member.status !== 'active') throw new ConvexError('Member not found')

		await ctx.db.patch(member._id, {
			status: 'removed',
			removedAt: Date.now(),
		})
	},
})

export const setRole = mutation({
	args: {
		userId: v.id('users'),
		role: assignableSchoolRoleValidator,
	},
	handler: async (ctx, args) => {
		const { userId, membership, school } = await requireAdmin(ctx)
		if (args.userId === userId && args.role !== 'admin') {
			throw new ConvexError('Admins cannot demote themselves')
		}

		const member = await ctx.db
			.query('memberships')
			.withIndex('by_school_user', (q) => q.eq('schoolId', membership.schoolId).eq('userId', args.userId))
			.unique()
		if (!member || member.status !== 'active') throw new ConvexError('Member not found')
		if (member.role === 'owner' || member.userId === school.createdBy) {
			throw new ConvexError('Owner role cannot be changed')
		}

		await ctx.db.patch(member._id, { role: args.role })
	},
})

export const transferOwnership = mutation({
	args: { userId: v.id('users') },
	handler: async (ctx, args) => {
		const { userId, membership, school } = await requireOwner(ctx)
		if (args.userId === userId) throw new ConvexError('Owner already belongs to this user')

		const newOwnerMembership = await ctx.db
			.query('memberships')
			.withIndex('by_school_user', (q) => q.eq('schoolId', membership.schoolId).eq('userId', args.userId))
			.unique()
		if (!newOwnerMembership || newOwnerMembership.status !== 'active') throw new ConvexError('Member not found')

		await ctx.db.patch(membership._id, { role: 'admin' })
		await ctx.db.patch(newOwnerMembership._id, { role: 'owner' })
		await ctx.db.patch(school._id, { createdBy: args.userId })
	},
})

export const updateSubscriptionFromStripe = internalMutation({
	args: {
		schoolId: v.id('schools'),
		stripeCustomerId: v.optional(v.string()),
		stripeSubscriptionId: v.optional(v.string()),
		subscriptionStatus: v.string(),
		seatLimit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const school = await ctx.db.get(args.schoolId)
		if (!school) throw new ConvexError('School not found')

		await ctx.db.patch(args.schoolId, {
			stripeCustomerId: args.stripeCustomerId,
			stripeSubscriptionId: args.stripeSubscriptionId,
			subscriptionStatus: mapStripeStatus(args.subscriptionStatus),
			...(args.seatLimit ? { seatLimit: Math.max(DEFAULT_SEAT_LIMIT, args.seatLimit) } : {}),
		})
	},
})

function mapStripeStatus(status: string) {
	if (status === 'active' || status === 'trialing') return 'active'
	if (status === 'past_due') return 'pastDue'
	if (status === 'canceled' || status === 'unpaid') return 'canceled'
	if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete'
	return 'none'
}
