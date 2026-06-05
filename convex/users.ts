import { query } from './_generated/server'
import { getActiveMembershipForUser, requireUser } from './lib/auth'

export const viewer = query({
	args: {},
	handler: async (ctx) => {
		const { userId, user } = await requireUser(ctx)
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
