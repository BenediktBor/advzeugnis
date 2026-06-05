import { registerRoutes } from '@convex-dev/stripe'
import { httpRouter } from 'convex/server'
import type Stripe from 'stripe'
import { auth } from './auth'
import { components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

const http = httpRouter()

auth.addHttpRoutes(http)

async function syncSubscription(ctx: any, subscription: Stripe.Subscription) {
	const schoolId = subscription.metadata?.schoolId as Id<'schools'> | undefined
	if (!schoolId) return

	await ctx.runMutation(internal.schools.updateSubscriptionFromStripe, {
		schoolId,
		stripeCustomerId: typeof subscription.customer === 'string'
			? subscription.customer
			: subscription.customer.id,
		stripeSubscriptionId: subscription.id,
		subscriptionStatus: subscription.status,
		seatLimit: subscription.items.data[0]?.quantity ?? undefined,
	})
}

registerRoutes(http, components.stripe as any, {
	webhookPath: '/stripe/webhook',
	events: {
		'customer.subscription.created': async (ctx, event) => {
			await syncSubscription(ctx, event.data.object)
		},
		'customer.subscription.updated': async (ctx, event) => {
			await syncSubscription(ctx, event.data.object)
		},
		'customer.subscription.deleted': async (ctx, event) => {
			await syncSubscription(ctx, event.data.object)
		},
	},
})

export default http
