import { storeToRefs } from 'pinia'
import { useConvexQuery } from 'convex-vue'
import { clearStaleAuthSession, shouldClearStaleSession } from '~/utils/authSession'
import { useCurrentUserStore } from '~/stores/currentUser'
import { api } from '~/utils/convexApi'
import { getStoredAuthToken } from '~/utils/convexAuthClient'

export function useCurrentUser() {
	const store = useCurrentUserStore()
	store.load()
	const viewer = useConvexQuery(api.users.viewer, {}, { server: false })

	watch(
		[viewer.data, viewer.isPending],
		([data, isPending]) => {
		if (!data) {
			if (!isPending) store.clearUser()
			return
		}

		const nextUser = {
			id: data.id,
			displayName: data.displayName,
			email: data.email,
			type: data.school ? 'school' : 'solo',
			role: data.school?.role,
			schoolId: data.school?.id,
			schoolName: data.school?.name,
		} as const

		const current = store.currentUser
		if (
			current.id === nextUser.id &&
			current.displayName === nextUser.displayName &&
			current.email === nextUser.email &&
			current.type === nextUser.type &&
			current.role === nextUser.role &&
			current.schoolId === nextUser.schoolId &&
			current.schoolName === nextUser.schoolName
		) return

		store.setStubUser(nextUser)
		},
		{ immediate: true },
	)
	watch(
		[viewer.data, viewer.isPending],
		([data, isPending]) => {
			if (isPending || data) return
			if (!shouldClearStaleSession({
				hasToken: Boolean(getStoredAuthToken()),
				isLoaded: true,
				isAuthenticated: false,
			})) return
			clearStaleAuthSession()
		},
	)

	const { currentUser, isLoaded, hasSchool, isAdmin, canEditTemplates, canManageTeachers } = storeToRefs(store)

	return {
		currentUser,
		isLoaded: computed(() => isLoaded.value && !viewer.isPending.value),
		isAuthenticated: computed(() => Boolean(viewer.data.value)),
		authError: viewer.error,
		hasSchool,
		isAdmin,
		canEditTemplates,
		canManageTeachers,
		setUserType: store.setUserType,
		setUserRole: store.setUserRole,
		setStubUser: store.setStubUser,
	}
}
