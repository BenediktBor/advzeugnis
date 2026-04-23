import { useSchoolStore } from '~/stores/school'

export function useSchool() {
	const store = useSchoolStore()
	store.load()

	return {
		members: computed(() => store.members),
		isLoaded: computed(() => store.isLoaded),
		addMember: store.addMember,
		removeMember: store.removeMember,
		setRole: store.setRole,
	}
}
