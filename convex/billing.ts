import { ConvexError, v } from 'convex/values'
import { StripeSubscriptions } from '@convex-dev/stripe'
import { action } from './_generated/server'
import { api, components } from './_generated/api'

const stripeClient = new StripeSubscriptions(components.stripe as any, {})

export const createSchoolCheckout = action({
	args: {
		priceId: v.string(),
		seatLimit: v.number(),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const billing = await ctx.runQuery(api.schools.billingContext)
		if (!billing) throw new ConvexError('School not found')

		const customer = billing.stripeCustomerId
			? { customerId: billing.stripeCustomerId }
			: await stripeClient.createCustomer(ctx, {
					email: billing.email,
					name: billing.schoolName,
					metadata: { schoolId: billing.schoolId },
					idempotencyKey: billing.schoolId,
				})

		return await stripeClient.createCheckoutSession(ctx, {
			priceId: args.priceId,
			customerId: customer.customerId,
			mode: 'subscription',
			quantity: Math.max(1, Math.floor(args.seatLimit)),
			successUrl: args.successUrl,
			cancelUrl: args.cancelUrl,
			metadata: { schoolId: billing.schoolId },
			subscriptionMetadata: { schoolId: billing.schoolId },
		})
	},
})

export const createCustomerPortal = action({
	args: {
		returnUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const billing = await ctx.runQuery(api.schools.billingContext)
		if (!billing?.stripeCustomerId) throw new ConvexError('No Stripe customer for this school')

		return await stripeClient.createCustomerPortalSession(ctx, {
			customerId: billing.stripeCustomerId,
			returnUrl: args.returnUrl,
		})
	},
})

export const updateSeatQuantity = action({
	args: {
		seatLimit: v.number(),
	},
	handler: async (ctx, args) => {
		const billing = await ctx.runQuery(api.schools.billingContext)
		if (!billing?.stripeSubscriptionId) throw new ConvexError('No Stripe subscription for this school')

		await stripeClient.updateSubscriptionQuantity(ctx, {
			stripeSubscriptionId: billing.stripeSubscriptionId,
			quantity: Math.max(1, Math.floor(args.seatLimit)),
		})
	},
})
