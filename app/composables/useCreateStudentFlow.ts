import { buildDeactivatedReportSelection } from '~/utils/reportText'

export function useCreateStudentFlow() {
	const router = useRouter()
	const { orderedIds, getSetData } = useTemplateSets()
	const { addStudent } = useStudents()

	const canCreateStudent = computed(() => orderedIds.value.length > 0)

	function createStudentAndOpen() {
		const defaultSetId = orderedIds.value[0]
		if (!defaultSetId) return null
		const templateSet = getSetData(defaultSetId)

		const newId = addStudent({
			name: '',
			surname: '',
			gender: 'male',
			templateSetId: defaultSetId,
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
