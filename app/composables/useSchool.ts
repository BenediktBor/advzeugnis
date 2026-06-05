import type { SchoolInvite, SchoolMember, SchoolRole } from '~/types/user'
import { api } from '~/utils/convexApi'

export function useSchool() {
	const client = useConvexClient()
	const schoolQuery = useConvexQuery(api.schools.current, {}, { server: false })
	const membersQuery = useConvexQuery(api.schools.members, {}, { server: false })
	const invitesQuery = useConvexQuery(api.schools.invites, {}, { server: false })

	async function createSchool(args: { name: string, seatLimit?: number }) {
		return await client.mutation(api.schools.createSchool, args)
	}

	async function inviteMember(args: { email: string, role: SchoolRole, siteUrl: string }) {
		return await client.action(api.schools.inviteUserWithEmail, args) as {
			inviteId: string
			token: string
			inviteUrl: string
			emailSent: boolean
			emailId?: string
			emailError?: string
		}
	}

	async function revokeInvite(inviteId: string) {
		await client.mutation(api.schools.revokeInvite, { inviteId })
	}

	async function acceptInvite(token: string) {
		return await client.mutation(api.schools.acceptInvite, { token })
	}

	async function removeMember(userId: string) {
		await client.mutation(api.schools.removeMember, { userId })
	}

	async function setRole(userId: string, role: SchoolRole) {
		await client.mutation(api.schools.setRole, { userId, role })
	}

	async function transferOwnership(userId: string) {
		await client.mutation(api.schools.transferOwnership, { userId })
	}

	return {
		school: computed(() => schoolQuery.data.value ?? null),
		members: computed<SchoolMember[]>(() => membersQuery.data.value ?? []),
		invites: computed<SchoolInvite[]>(() => invitesQuery.data.value ?? []),
		isLoaded: computed(() => !schoolQuery.isPending.value && !membersQuery.isPending.value),
		error: computed(() => schoolQuery.error.value ?? membersQuery.error.value ?? invitesQuery.error.value),
		createSchool,
		inviteMember,
		revokeInvite,
		acceptInvite,
		removeMember,
		setRole,
		transferOwnership,
	}
}
