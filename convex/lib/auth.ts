import { ConvexError } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

export type SchoolRole = 'owner' | 'admin' | 'templateManager' | 'teacher'
export type AuthorizedCtx = QueryCtx | MutationCtx

export async function requireUser(ctx: AuthorizedCtx) {
	const userId = await getAuthUserId(ctx)
	if (!userId) throw new ConvexError('Not authenticated')

	const user = await ctx.db.get(userId)
	if (!user) throw new ConvexError('Authenticated user was not found')

	return { userId, user }
}

export async function getActiveMembershipForUser(
	ctx: AuthorizedCtx,
	userId: Id<'users'>,
): Promise<Doc<'memberships'> | null> {
	const memberships = await ctx.db
		.query('memberships')
		.withIndex('by_user', (q) => q.eq('userId', userId))
		.collect()

	return memberships.find((membership) => membership.status === 'active') ?? null
}

export async function requireActiveMembership(ctx: AuthorizedCtx) {
	const { userId, user } = await requireUser(ctx)
	const membership = await getActiveMembershipForUser(ctx, userId)
	if (!membership) throw new ConvexError('No active school membership')

	const school = await ctx.db.get(membership.schoolId)
	if (!school) throw new ConvexError('School was not found')

	return { userId, user, membership, school }
}

export async function requireSchoolMember(ctx: AuthorizedCtx, schoolId?: Id<'schools'>) {
	const result = await requireActiveMembership(ctx)
	if (schoolId && result.membership.schoolId !== schoolId) {
		throw new ConvexError('No access to this school')
	}

	return result
}

export async function requireAdmin(ctx: AuthorizedCtx, schoolId?: Id<'schools'>) {
	const result = await requireSchoolMember(ctx, schoolId)
	if (result.membership.role !== 'owner' && result.membership.role !== 'admin') throw new ConvexError('Admin role required')
	return result
}

export async function requireOwner(ctx: AuthorizedCtx, schoolId?: Id<'schools'>) {
	const result = await requireSchoolMember(ctx, schoolId)
	if (result.membership.role !== 'owner' && result.school.createdBy !== result.userId) {
		throw new ConvexError('Owner role required')
	}
	return result
}

export async function requireTemplateManagerOrAdmin(ctx: AuthorizedCtx, schoolId?: Id<'schools'>) {
	const result = await requireSchoolMember(ctx, schoolId)
	if (
		result.membership.role !== 'owner' &&
		result.membership.role !== 'admin' &&
		result.membership.role !== 'templateManager'
	) {
		throw new ConvexError('Template manager role required')
	}
	return result
}

export async function requireActionUser(ctx: ActionCtx) {
	const userId = await getAuthUserId(ctx)
	if (!userId) throw new ConvexError('Not authenticated')
	return userId
}

export function hasActiveSubscription(school: Doc<'schools'>) {
	return school.subscriptionStatus === 'active'
}

export async function requireActiveSubscription(ctx: AuthorizedCtx, schoolId?: Id<'schools'>) {
	const result = await requireAdmin(ctx, schoolId)
	if (!hasActiveSubscription(result.school)) {
		throw new ConvexError('An active school subscription is required')
	}
	return result
}
