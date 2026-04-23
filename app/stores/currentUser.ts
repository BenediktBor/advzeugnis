import { defineStore } from 'pinia'
import { idbGet, createDebouncedPersist } from '~/utils/idbStorage'
import { CurrentUserSchema } from '~/schemas/user'
import type { CurrentUser, SchoolRole, UserType } from '~/types/user'

const STORAGE_KEY = 'auth-stub'

// Deterministic defaults: avoids module-evaluation randomness (SSR/tests).
const DEFAULT_CURRENT_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export const defaultUser: CurrentUser = {
	id: DEFAULT_CURRENT_USER_ID,
	displayName: 'Demo Benutzer',
	email: 'demo@example.com',
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
	const { persist: debouncedPersist } = createDebouncedPersist<CurrentUser>(STORAGE_KEY)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const raw = await idbGet<CurrentUser>(STORAGE_KEY)
		if (raw) {
			const repaired = repairStoredCurrentUser(raw)
			const didRepair = JSON.stringify(repaired) !== JSON.stringify(raw)
			currentUser.value = repaired
			if (didRepair) persist()
		}
		isLoaded.value = true
	}

	function persist() {
		debouncedPersist(currentUser.value)
	}

	const isAdmin = computed(
		() =>
			currentUser.value.type === 'solo' ||
			currentUser.value.role === 'admin'
	)
	const canEditTemplates = computed(
		() =>
			currentUser.value.type === 'solo' ||
			currentUser.value.role === 'admin' ||
			currentUser.value.role === 'editor'
	)
	const canManageTeachers = computed(
		() =>
			currentUser.value.type === 'school' &&
			currentUser.value.role === 'admin'
	)

	function setUserType(type: UserType) {
		currentUser.value = {
			...currentUser.value,
			type,
			...(type === 'solo'
				? { role: undefined }
				: { role: 'admin' as SchoolRole }),
		}
		persist()
	}

	function setUserRole(role: SchoolRole) {
		if (currentUser.value.type !== 'school') return
		currentUser.value = { ...currentUser.value, role }
		persist()
	}

	function setStubUser(user: Partial<CurrentUser>) {
		currentUser.value = { ...currentUser.value, ...user }
		persist()
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
	}
})
