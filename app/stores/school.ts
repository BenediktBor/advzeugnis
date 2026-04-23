import { defineStore } from 'pinia'
import { idbGet, createDebouncedPersist } from '~/utils/idbStorage'
import { SchoolMemberSchema } from '~/schemas/user'
import type { SchoolMember, SchoolRole } from '~/types/user'
import { randomId } from '~/utils/randomId'

const STORAGE_KEY = 'school-members-stub'

// Deterministic defaults: avoids module-evaluation randomness (SSR/tests).
const DEFAULT_ADMIN_ID = '11111111-1111-1111-1111-111111111111'
const DEFAULT_EDITOR_ID = '22222222-2222-2222-2222-222222222222'
const DEFAULT_TEACHER_ID = '33333333-3333-3333-3333-333333333333'

export const defaultMembers: SchoolMember[] = [
	{ id: DEFAULT_ADMIN_ID, displayName: 'Anna Admin', email: 'anna@schule.example', role: 'admin' },
	{ id: DEFAULT_EDITOR_ID, displayName: 'Erik Editor', email: 'erik@schule.example', role: 'editor' },
	{ id: DEFAULT_TEACHER_ID, displayName: 'Thea Teacher', email: 'thea@schule.example', role: 'teacher' },
]

export function repairStoredSchoolMembers(raw: SchoolMember[] | undefined): SchoolMember[] {
	const initial = raw ?? defaultMembers.map((member) => ({ ...member }))

	const repaired: SchoolMember[] = []
	let droppedCount = 0
	for (const member of initial) {
		const parsed = SchoolMemberSchema.safeParse(member)
		if (parsed.success) {
			repaired.push(parsed.data as SchoolMember)
			continue
		}

		droppedCount++
		console.warn('[school] Dropping invalid stored school member:', parsed.error.issues)
	}

	if (droppedCount > 0) {
		console.warn(`[school] Repaired persisted state by dropping ${droppedCount} invalid member(s).`)
	}

	return repaired
}

export const useSchoolStore = defineStore('school', () => {
	const members = ref<SchoolMember[]>([])
	const isLoaded = ref(false)
	const { persist: debouncedPersist } = createDebouncedPersist<SchoolMember[]>(STORAGE_KEY)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const raw = await idbGet<SchoolMember[]>(STORAGE_KEY)
		const repaired = repairStoredSchoolMembers(raw)
		const didRepair = raw != null && JSON.stringify(repaired) !== JSON.stringify(raw)

		members.value = repaired
		isLoaded.value = true
		if (!raw || didRepair) void persist()
	}

	function persist() {
		debouncedPersist(members.value)
	}

	function addMember(member: Omit<SchoolMember, 'id'>) {
		const id = randomId()
		members.value = [...members.value, { ...member, id }]
		persist()
		return id
	}

	function removeMember(id: string) {
		members.value = members.value.filter((m) => m.id !== id)
		persist()
	}

	function setRole(id: string, role: SchoolRole) {
		members.value = members.value.map((m) =>
			m.id === id ? { ...m, role } : m
		)
		persist()
	}

	return {
		members,
		isLoaded,
		load,
		addMember,
		removeMember,
		setRole,
	}
})
