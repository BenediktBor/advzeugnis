import { useStudentsStore } from '~/stores/students'
import type { Student, ReportSelection } from '~/types/student'

export type { Student, ReportSelection }

export function useStudents() {
	const store = useStudentsStore()
	store.load()

	return {
		students: computed(() => store.students),
		isLoaded: computed(() => store.isLoaded),
		addStudent: store.addStudent,
		updateStudent: store.updateStudent,
		deleteStudent: store.deleteStudent,
		getStudent: store.getStudent,
	}
}
