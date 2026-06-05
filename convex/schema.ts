import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const schoolRoleValidator = v.union(
	v.literal('admin'),
	v.literal('templateManager'),
	v.literal('teacher'),
)

export const subscriptionStatusValidator = v.union(
	v.literal('none'),
	v.literal('checkoutPending'),
	v.literal('active'),
	v.literal('pastDue'),
	v.literal('canceled'),
	v.literal('incomplete'),
)

export default defineSchema({
	...authTables,
	users: defineTable({
		name: v.optional(v.string()),
		image: v.optional(v.string()),
		email: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		phone: v.optional(v.string()),
		phoneVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
	}).index('email', ['email']),
	schools: defineTable({
		name: v.string(),
		createdBy: v.id('users'),
		stripeCustomerId: v.optional(v.string()),
		stripeSubscriptionId: v.optional(v.string()),
		subscriptionStatus: subscriptionStatusValidator,
		seatLimit: v.number(),
	}).index('by_created_by', ['createdBy'])
		.index('by_stripe_customer', ['stripeCustomerId'])
		.index('by_stripe_subscription', ['stripeSubscriptionId']),
	memberships: defineTable({
		userId: v.id('users'),
		schoolId: v.id('schools'),
		role: schoolRoleValidator,
		status: v.union(v.literal('active'), v.literal('removed')),
		invitedBy: v.optional(v.id('users')),
		createdAt: v.number(),
		removedAt: v.optional(v.number()),
	}).index('by_user', ['userId'])
		.index('by_school', ['schoolId'])
		.index('by_school_user', ['schoolId', 'userId']),
	invites: defineTable({
		schoolId: v.id('schools'),
		email: v.string(),
		role: schoolRoleValidator,
		token: v.string(),
		status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('revoked'), v.literal('expired')),
		invitedBy: v.id('users'),
		invitedUserId: v.optional(v.id('users')),
		createdAt: v.number(),
		expiresAt: v.number(),
		acceptedAt: v.optional(v.number()),
	}).index('by_token', ['token'])
		.index('by_school', ['schoolId'])
		.index('by_school_email', ['schoolId', 'email']),
	templateSets: defineTable({
		schoolId: v.id('schools'),
		templateId: v.string(),
		label: v.string(),
		data: v.any(),
		sortOrder: v.number(),
		updatedBy: v.id('users'),
		updatedAt: v.number(),
	}).index('by_school', ['schoolId'])
		.index('by_school_template', ['schoolId', 'templateId']),
})
