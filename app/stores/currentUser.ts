import { defineStore } from 'pinia'
import { CurrentUserSchema } from '~/schemas/user'
import type { CurrentUser, SchoolRole, UserType } from '~/types/user'

// Deterministic defaults: avoids module-evaluation randomness (SSR/tests).
const DEFAULT_CURRENT_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export const defaultUser: CurrentUser = {
	id: DEFAULT_CURRENT_USER_ID,
	displayName: 'Demo Benutzer',
	email: undefined,
	type: 'solo',
}

export function repairStoredCurrentUser(raw: CurrentUser | undefined): CurrentUser {
	if (!raw) return { ...defaultUser }

	const parsed = CurrentUserSchema.safeParse(raw)
	if (parsed.success) {
		return parsed.data as CurrentUser
	}

	console.warn('[currentUser] Resetting invalid persisted user state:', parsed.error.issues)
	return { ...defaultUser }
}

export const useCurrentUserStore = defineStore('currentUser', () => {
	const currentUser = ref<CurrentUser>({ ...defaultUser })
	const isLoaded = ref(false)

	function load() {
		isLoaded.value = true
		return Promise.resolve()
	}

	const isAdmin = computed(
		() =>
			currentUser.value.type === 'school' &&
			(currentUser.value.role === 'owner' || currentUser.value.role === 'admin')
	)
	const canEditTemplates = computed(
		() =>
			currentUser.value.type === 'school' && (
			currentUser.value.role === 'owner' ||
			currentUser.value.role === 'admin' ||
			currentUser.value.role === 'templateManager'
			)
	)
	const canManageTeachers = computed(
		() =>
			currentUser.value.type === 'school' &&
			(currentUser.value.role === 'owner' || currentUser.value.role === 'admin')
	)

	function setUserType(type: UserType) {
		currentUser.value = {
			...currentUser.value,
			type,
			...(type === 'solo'
				? { role: undefined }
				: { role: 'admin' as SchoolRole }),
		}
	}

	function setUserRole(role: SchoolRole) {
		if (currentUser.value.type !== 'school') return
		currentUser.value = { ...currentUser.value, role }
	}

	function setStubUser(user: Partial<CurrentUser>) {
		currentUser.value = { ...currentUser.value, ...user }
		isLoaded.value = true
	}

	function clearUser() {
		currentUser.value = { ...defaultUser }
		isLoaded.value = true
	}

	return {
		currentUser,
		isLoaded,
		isAdmin,
		canEditTemplates,
		canManageTeachers,
		load,
		setUserType,
		setUserRole,
		setStubUser,
		clearUser,
	}
})
