import { defineStore } from 'pinia'
import { idbLoad, createDebouncedPersist } from '~/utils/idbStorage'
import { StudentSchema } from '~/schemas/student'
import { randomId } from '~/utils/randomId'
import type { Student, ReportSelection } from '~/types/student'

const STORAGE_KEY = 'students'

interface StoredStudent {
	id: string
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId?: string
	templateSetLabel?: string
	reportSelection?: ReportSelection
	variantSelections?: unknown
	excludedSubjectIndices?: unknown
	excludedCategoryKeys?: unknown
	selectedGradePerCategory?: unknown
}

function migrateStudent(s: StoredStudent): Student {
	const hasLegacyIndexKeys =
		s.variantSelections != null ||
		s.excludedSubjectIndices != null ||
		s.excludedCategoryKeys != null ||
		s.selectedGradePerCategory != null

	const hasOldIndexBasedSelection =
		s.reportSelection?.categories &&
		Object.keys(s.reportSelection.categories).some((k) => /^\d+-\d+$/.test(k))

	if (hasLegacyIndexKeys || hasOldIndexBasedSelection) {
		return {
			id: s.id,
			name: s.name,
			surname: s.surname,
			gender: s.gender,
			templateSetId: s.templateSetId ?? s.templateSetLabel ?? '',
			reportSelection: { categories: {} },
		}
	}

	return {
		id: s.id,
		name: s.name,
		surname: s.surname,
		gender: s.gender,
		templateSetId: s.templateSetId ?? s.templateSetLabel ?? '',
		reportSelection: s.reportSelection,
	}
}

export function repairStoredStudents(raw: StoredStudent[] | undefined): Student[] {
	if (!Array.isArray(raw)) return []

	const migrated = raw.map(migrateStudent)
	const repaired: Student[] = []
	let droppedCount = 0

	for (const candidate of migrated) {
		const parsed = StudentSchema.safeParse(candidate)
		if (parsed.success) {
			repaired.push(parsed.data as Student)
			continue
		}

		droppedCount++
		console.warn('[students] Dropping invalid stored student:', parsed.error.issues)
	}

	if (droppedCount > 0) {
		console.warn(`[students] Repaired persisted state by dropping ${droppedCount} invalid student(s).`)
	}

	return repaired
}

export const useStudentsStore = defineStore('students', () => {
	const students = ref<Student[]>([])
	const isLoaded = ref(false)
	const loadError = ref<unknown>(null)
	const { persist: debouncedPersist } = createDebouncedPersist<Student[]>(STORAGE_KEY)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const result = await idbLoad<StoredStudent[]>(STORAGE_KEY)
		loadError.value = result.error
		students.value = repairStoredStudents(result.value)
		isLoaded.value = true
		debouncedPersist(students.value)
	}

	function persist() {
		debouncedPersist(students.value)
	}

	function addStudent(student: Omit<Student, 'id'>) {
		const id = randomId()
		students.value = [...students.value, { ...student, id }]
		persist()
		return id
	}

	function updateStudent(id: string, partial: Partial<Omit<Student, 'id'>>) {
		students.value = students.value.map((s) =>
			s.id === id ? { ...s, ...partial } : s
		)
		persist()
	}

	function deleteStudent(id: string) {
		students.value = students.value.filter((s) => s.id !== id)
		persist()
	}

	function getStudent(id: string) {
		return computed(() => students.value.find((s) => s.id === id))
	}

	return {
		students,
		isLoaded,
		loadError,
		load,
		addStudent,
		updateStudent,
		deleteStudent,
		getStudent,
	}
})
