import { ConvexError, v } from 'convex/values'
import { action } from './_generated/server'

type StripeRedirectSession = {
	url: string | null
}

function billingDisabled(): never {
	throw new ConvexError('Billing is temporarily disabled')
}

export const createSchoolCheckout = action({
	args: {
		seatLimit: v.number(),
	},
	handler: async (ctx, args): Promise<StripeRedirectSession> => {
		void ctx
		void args
		return billingDisabled()
	},
})

export const createCustomerPortal = action({
	args: {},
	handler: async (ctx): Promise<StripeRedirectSession> => {
		void ctx
		return billingDisabled()
	},
})

export const updateSeatQuantity = action({
	args: {
		seatLimit: v.number(),
	},
	handler: async (ctx, args): Promise<void> => {
		void ctx
		void args
		billingDisabled()
	},
})

// Stripe billing is temporarily disabled until the Convex deployment is ready.
// Re-enable by restoring the imports below, the stripeClient, helper types, and the action handlers above.
//
// import { StripeSubscriptions } from '@convex-dev/stripe'
// import { api, components, internal } from './_generated/api'
// import type { Id } from './_generated/dataModel'
// import { buildAppUrl, getStripePriceId } from './lib/config'
//
// const stripeClient = new StripeSubscriptions(components.stripe as any, {})
// const MAX_SEAT_LIMIT = 500
//
// type BillingContext = {
// 	userId: Id<'users'>
// 	email?: string
// 	name?: string
// 	schoolId: Id<'schools'>
// 	schoolName: string
// 	stripeCustomerId?: string
// 	stripeSubscriptionId?: string
// 	seatLimit: number
// 	activeMemberCount: number
// 	subscriptionStatus: string
// }
//
// type StripeCustomerRef = {
// 	customerId: string
// }
//
// function normalizeSeatLimit(value: number, activeMemberCount: number) {
// 	if (!Number.isFinite(value)) throw new ConvexError('Seat limit must be a finite number')
// 	const seatLimit = Math.floor(value)
// 	if (seatLimit < activeMemberCount) throw new ConvexError('Seat limit cannot be lower than active members')
// 	if (seatLimit < 1 || seatLimit > MAX_SEAT_LIMIT) throw new ConvexError('Seat limit is outside the allowed range')
// 	return seatLimit
// }
//
// createSchoolCheckout handler:
// const billing = await ctx.runQuery(api.schools.billingContext) as BillingContext | null
// if (!billing) throw new ConvexError('School not found')
// const seatLimit = normalizeSeatLimit(args.seatLimit, billing.activeMemberCount)
//
// const customer: StripeCustomerRef = billing.stripeCustomerId
// 	? { customerId: billing.stripeCustomerId }
// 	: await stripeClient.createCustomer(ctx, {
// 			email: billing.email,
// 			name: billing.schoolName,
// 			metadata: { schoolId: billing.schoolId },
// 			idempotencyKey: billing.schoolId,
// 		})
// if (!billing.stripeCustomerId) {
// 	await ctx.runMutation(internal.schools.updateStripeCustomer, {
// 		schoolId: billing.schoolId,
// 		stripeCustomerId: customer.customerId,
// 	})
// }
//
// const checkout = await stripeClient.createCheckoutSession(ctx, {
// 	priceId: getStripePriceId(),
// 	customerId: customer.customerId,
// 	mode: 'subscription',
// 	quantity: seatLimit,
// 	successUrl: buildAppUrl('/app/school?billing=success'),
// 	cancelUrl: buildAppUrl('/app/setup-school?billing=cancelled'),
// 	metadata: { schoolId: billing.schoolId },
// 	subscriptionMetadata: { schoolId: billing.schoolId },
// })
// await ctx.runMutation(internal.schools.updateSeatLimit, {
// 	schoolId: billing.schoolId,
// 	seatLimit,
// })
// return checkout
//
// createCustomerPortal handler:
// const billing = await ctx.runQuery(api.schools.billingContext) as BillingContext | null
// if (!billing?.stripeCustomerId) throw new ConvexError('No Stripe customer for this school')
//
// return await stripeClient.createCustomerPortalSession(ctx, {
// 	customerId: billing.stripeCustomerId,
// 	returnUrl: buildAppUrl('/app/school'),
// })
//
// updateSeatQuantity handler:
// const billing = await ctx.runQuery(api.schools.billingContext) as BillingContext | null
// if (!billing?.stripeSubscriptionId) throw new ConvexError('No Stripe subscription for this school')
// const seatLimit = normalizeSeatLimit(args.seatLimit, billing.activeMemberCount)
//
// await stripeClient.updateSubscriptionQuantity(ctx, {
// 	stripeSubscriptionId: billing.stripeSubscriptionId,
// 	quantity: seatLimit,
// })
// await ctx.runMutation(internal.schools.updateSeatLimit, {
// 	schoolId: billing.schoolId,
// 	seatLimit,
// })
