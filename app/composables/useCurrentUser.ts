import { storeToRefs } from 'pinia'
import { useCurrentUserStore } from '~/stores/currentUser'

export function useCurrentUser() {
	const store = useCurrentUserStore()
	store.load()

	const { currentUser, isLoaded, isAdmin, canEditTemplates, canManageTeachers } = storeToRefs(store)

	return {
		currentUser,
		isLoaded,
		isAdmin,
		canEditTemplates,
		canManageTeachers,
		setUserType: store.setUserType,
		setUserRole: store.setUserRole,
		setStubUser: store.setStubUser,
	}
}
