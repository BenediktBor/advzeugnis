import { ConvexError, v } from 'convex/values'
import { action, internalMutation, mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { assignableSchoolRoleValidator } from './schema'
import {
	getActiveMembershipForSchoolUser,
	getActiveMembershipForUser,
	hasActiveSubscription,
	requireActiveSubscription,
	requireAdmin,
	requireOwner,
	requireUser,
} from './lib/auth'
import { api } from './_generated/api'
import { sendResendEmail } from './ResendOTP'
import { buildAppUrl } from './lib/config'
import { buildSchoolInviteEmail } from './lib/emails'

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14
const DEFAULT_SEAT_LIMIT = 1
const MAX_SEAT_LIMIT = 500
const SCHOOL_CREATION_PASSWORD_ENV = 'SCHOOL_CREATION_PASSWORD'

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

async function countPendingInvites(ctx: Parameters<typeof requireAdmin>[0], schoolId: Id<'schools'>) {
	const invites = await ctx.db
		.query('invites')
		.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
		.collect()
	const now = Date.now()
	return invites.filter((invite) => invite.status === 'pending' && invite.expiresAt > now).length
}

async function countReservedSeats(ctx: Parameters<typeof requireAdmin>[0], schoolId: Id<'schools'>) {
	const [activeMemberCount, pendingInviteCount] = await Promise.all([
		countActiveMembers(ctx, schoolId),
		countPendingInvites(ctx, schoolId),
	])
	return activeMemberCount + pendingInviteCount
}

function normalizeSeatLimit(value: number | undefined, minimum = DEFAULT_SEAT_LIMIT) {
	const rawSeatLimit = value ?? minimum
	if (!Number.isFinite(rawSeatLimit)) throw new ConvexError('Seat limit must be a finite number')
	const seatLimit = Math.floor(rawSeatLimit)
	if (seatLimit < minimum || seatLimit > MAX_SEAT_LIMIT) throw new ConvexError('Seat limit is outside the allowed range')
	return seatLimit
}

function requireSchoolCreationPassword(accessPassword: string) {
	const expectedPassword = process.env[SCHOOL_CREATION_PASSWORD_ENV]?.trim()
	if (!expectedPassword) {
		throw new ConvexError('School creation is not configured')
	}
	if (accessPassword.trim() !== expectedPassword) {
		throw new ConvexError('Invalid school creation password')
	}
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
		}
	},
})

export const members = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireUser(ctx)
		const membership = await getActiveMembershipForUser(ctx, userId)
		if (!membership) return []
		if (membership.role !== 'owner' && membership.role !== 'admin') return []
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
		const activeMemberCount = await countActiveMembers(ctx, membership.schoolId)
		return {
			userId,
			email: user.email,
			name: user.name,
			schoolId: membership.schoolId,
			schoolName: school.name,
			stripeCustomerId: school.stripeCustomerId,
			stripeSubscriptionId: school.stripeSubscriptionId,
			seatLimit: school.seatLimit,
			activeMemberCount,
			subscriptionStatus: school.subscriptionStatus,
		}
	},
})

export const createSchool = mutation({
	args: {
		name: v.string(),
		seatLimit: v.optional(v.number()),
		accessPassword: v.string(),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireUser(ctx)
		requireSchoolCreationPassword(args.accessPassword)
		const existingMembership = await getActiveMembershipForUser(ctx, userId)
		if (existingMembership) throw new ConvexError('Users can only belong to one school')

		const now = Date.now()
		const schoolId = await ctx.db.insert('schools', {
			name: args.name.trim() || 'Neue Schule',
			createdBy: userId,
			subscriptionStatus: 'checkoutPending',
			seatLimit: normalizeSeatLimit(args.seatLimit),
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

		const existing = await ctx.db
			.query('invites')
			.withIndex('by_school_email', (q) => q.eq('schoolId', membership.schoolId).eq('email', email))
			.collect()
		for (const invite of existing) {
			if (invite.status === 'pending') await ctx.db.patch(invite._id, { status: 'revoked' })
		}

		const reservedSeatCount = await countReservedSeats(ctx, membership.schoolId)
		if (reservedSeatCount >= school.seatLimit) throw new ConvexError('No seats available')

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

		const inviter = await ctx.db.get(userId)
		const inviterName = inviter?.name ?? inviter?.email ?? 'Ein Kollege'

		return {
			inviteId,
			token,
			schoolName: school.name,
			role: args.role,
			inviterName,
		}
	},
})

export const inviteUserWithEmail = action({
	args: {
		email: v.string(),
		role: assignableSchoolRoleValidator,
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
		}) as {
			inviteId: Id<'invites'>
			token: string
			schoolName: string
			role: 'admin' | 'templateManager' | 'teacher'
			inviterName: string
		}
		const inviteUrl = buildAppUrl(`/invite/${invite.token}`)
		const inviteEmail = buildSchoolInviteEmail({
			schoolName: invite.schoolName,
			inviterName: invite.inviterName,
			role: invite.role,
			inviteUrl,
		})

		try {
			const email = await sendResendEmail({
				to: normalizeEmail(args.email),
				subject: inviteEmail.subject,
				text: inviteEmail.text,
				html: inviteEmail.html,
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
		if (!user.email) throw new ConvexError('Invite requires an account email')
		if (normalizeEmail(user.email) !== invite.email) {
			throw new ConvexError('Invite email does not match signed-in user')
		}

		const school = await ctx.db.get(invite.schoolId)
		if (!school || !hasActiveSubscription(school)) throw new ConvexError('School subscription is not active')
		const activeMemberCount = await countActiveMembers(ctx, invite.schoolId)
		if (activeMemberCount >= school.seatLimit) throw new ConvexError('No seats available')

		const existingMemberships = await ctx.db
			.query('memberships')
			.withIndex('by_school_user', (q) => q.eq('schoolId', invite.schoolId).eq('userId', userId))
			.collect()
		const removedMembership = existingMemberships.find((row) => row.status === 'removed')
		const now = Date.now()

		if (removedMembership) {
			await ctx.db.patch(removedMembership._id, {
				role: invite.role,
				status: 'active',
				invitedBy: invite.invitedBy,
				removedAt: undefined,
			})
		} else {
			await ctx.db.insert('memberships', {
				userId,
				schoolId: invite.schoolId,
				role: invite.role,
				status: 'active',
				invitedBy: invite.invitedBy,
				createdAt: now,
			})
		}
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
		const { userId, membership, school } = await requireAdmin(ctx)
		if (args.userId === userId) throw new ConvexError('Admins cannot remove themselves')

		const member = await getActiveMembershipForSchoolUser(ctx, membership.schoolId, args.userId)
		if (!member) throw new ConvexError('Member not found')
		if (member.role === 'owner' || member.userId === school.createdBy) {
			throw new ConvexError('Owner cannot be removed')
		}

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

		const member = await getActiveMembershipForSchoolUser(ctx, membership.schoolId, args.userId)
		if (!member) throw new ConvexError('Member not found')
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

		const newOwnerMembership = await getActiveMembershipForSchoolUser(ctx, membership.schoolId, args.userId)
		if (!newOwnerMembership) throw new ConvexError('Member not found')

		await ctx.db.patch(membership._id, { role: 'admin' })
		await ctx.db.patch(newOwnerMembership._id, { role: 'owner' })
		await ctx.db.patch(school._id, { createdBy: args.userId })
	},
})

export const deleteSchool = mutation({
	args: {},
	handler: async (ctx) => {
		const { membership, school } = await requireOwner(ctx)
		const schoolId = membership.schoolId
		const now = Date.now()

		const invites = await ctx.db
			.query('invites')
			.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
			.collect()
		for (const invite of invites) {
			await ctx.db.delete(invite._id)
		}

		const templateSets = await ctx.db
			.query('templateSets')
			.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
			.collect()
		for (const templateSet of templateSets) {
			await ctx.db.delete(templateSet._id)
		}

		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
			.collect()
		for (const row of memberships) {
			await ctx.db.patch(row._id, {
				status: 'removed',
				removedAt: now,
			})
		}

		await ctx.db.delete(school._id)
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
		const minimumSeatLimit = args.seatLimit
			? Math.max(DEFAULT_SEAT_LIMIT, await countActiveMembers(ctx, args.schoolId))
			: DEFAULT_SEAT_LIMIT

		await ctx.db.patch(args.schoolId, {
			stripeCustomerId: args.stripeCustomerId,
			stripeSubscriptionId: args.stripeSubscriptionId,
			subscriptionStatus: mapStripeStatus(args.subscriptionStatus),
			...(args.seatLimit ? { seatLimit: normalizeSeatLimit(args.seatLimit, minimumSeatLimit) } : {}),
		})
	},
})

export const updateSeatLimit = internalMutation({
	args: {
		schoolId: v.id('schools'),
		seatLimit: v.number(),
	},
	handler: async (ctx, args) => {
		const school = await ctx.db.get(args.schoolId)
		if (!school) throw new ConvexError('School not found')
		const minimumSeatLimit = Math.max(DEFAULT_SEAT_LIMIT, await countActiveMembers(ctx, args.schoolId))
		await ctx.db.patch(args.schoolId, {
			seatLimit: normalizeSeatLimit(args.seatLimit, minimumSeatLimit),
		})
	},
})

export const updateStripeCustomer = internalMutation({
	args: {
		schoolId: v.id('schools'),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const school = await ctx.db.get(args.schoolId)
		if (!school) throw new ConvexError('School not found')
		if (school.stripeCustomerId && school.stripeCustomerId !== args.stripeCustomerId) {
			throw new ConvexError('School already has a different Stripe customer')
		}
		await ctx.db.patch(args.schoolId, { stripeCustomerId: args.stripeCustomerId })
	},
})

function mapStripeStatus(status: string) {
	if (status === 'active' || status === 'trialing') return 'active'
	if (status === 'past_due') return 'pastDue'
	if (status === 'canceled' || status === 'unpaid') return 'canceled'
	if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete'
	return 'none'
}
