import { storeToRefs } from 'pinia'
import { useCurrentUserStore } from '~/stores/currentUser'
import { api } from '~/utils/convexApi'

export function useCurrentUser() {
	const store = useCurrentUserStore()
	store.load()
	const viewer = useConvexQuery(api.users.viewer, {}, { server: false })

	watchEffect(() => {
		const data = viewer.data.value
		if (!data) {
			if (!viewer.isPending.value) store.clearUser()
			return
		}

		store.setStubUser({
			id: data.id,
			displayName: data.displayName,
			email: data.email,
			type: data.school ? 'school' : 'solo',
			role: data.school?.role,
			schoolId: data.school?.id,
			schoolName: data.school?.name,
		})
	})

	const { currentUser, isLoaded, isAdmin, canEditTemplates, canManageTeachers } = storeToRefs(store)

	return {
		currentUser,
		isLoaded: computed(() => isLoaded.value && !viewer.isPending.value),
		isAuthenticated: computed(() => Boolean(viewer.data.value)),
		authError: viewer.error,
		isAdmin,
		canEditTemplates,
		canManageTeachers,
		setUserType: store.setUserType,
		setUserRole: store.setUserRole,
		setStubUser: store.setStubUser,
	}
}
