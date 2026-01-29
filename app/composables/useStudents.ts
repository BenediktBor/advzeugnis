import { get, set } from 'idb-keyval'

const STORAGE_KEY = 'students'

export interface Student {
	/** UUID v4 */
	id: string
	name: string
	surname: string
	gender: 'male' | 'female'
	templateYear: number
}

const studentsRef = ref<Student[]>([])

let loaded = false

async function loadFromStorage() {
	if (loaded) return
	const stored = await get<Student[]>(STORAGE_KEY)
	studentsRef.value = stored ?? []
	loaded = true
}

async function persist(list: Student[]) {
	await set(STORAGE_KEY, JSON.parse(JSON.stringify(list)))
}

export function useStudents() {
	loadFromStorage()

	return {
		students: studentsRef,
		addStudent(student: Omit<Student, 'id'>) {
			const id = crypto.randomUUID()
			const newStudent: Student = { ...student, id }
			studentsRef.value = [...studentsRef.value, newStudent]
			persist(studentsRef.value)
			return id
		},
		updateStudent(id: string, partial: Partial<Omit<Student, 'id'>>) {
			const index = studentsRef.value.findIndex((s) => s.id === id)
			if (index === -1) return
			studentsRef.value = studentsRef.value.map((s) =>
				s.id === id ? { ...s, ...partial } : s,
			)
			persist(studentsRef.value)
		},
		deleteStudent(id: string) {
			studentsRef.value = studentsRef.value.filter((s) => s.id !== id)
			persist(studentsRef.value)
		},
		getStudent(id: string) {
			return computed(() => studentsRef.value.find((s) => s.id === id))
		},
	}
}
