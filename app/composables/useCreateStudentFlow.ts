import { buildDeactivatedReportSelection } from '~/utils/reportText'

export interface CreateStudentInput {
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId: string
}

export function useCreateStudentFlow() {
	const router = useRouter()
	const { orderedIds, getSetData } = useTemplateSets()
	const { addStudent } = useStudents()

	const canCreateStudent = computed(() => orderedIds.value.length > 0)

	function createStudentAndOpen(input: CreateStudentInput) {
		const templateSetId = input.templateSetId || orderedIds.value[0]
		if (!templateSetId) return null
		const templateSet = getSetData(templateSetId)

		const newId = addStudent({
			name: input.name.trim(),
			surname: input.surname.trim(),
			gender: input.gender,
			templateSetId,
			reportSelection: templateSet
				? buildDeactivatedReportSelection(templateSet)
				: { categories: {} },
		})

		void router.push(`/app/students/${newId}`)
		return newId
	}

	return {
		canCreateStudent,
		createStudentAndOpen,
	}
}
