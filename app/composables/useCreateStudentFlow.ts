import { buildDeactivatedReportSelection } from '~/utils/reportText'

export interface CreateStudentInput {
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId: string
}

export function useCreateStudentFlow() {
	const router = useRouter()
	const { orderedIds, getSetData, loadSetData, defaultAlphabeticalTemplateSetId } = useTemplateSets()
	const { addStudent } = useStudents()
	const { hasSchool } = useCurrentUser()

	const canCreateStudent = computed(() => hasSchool.value && orderedIds.value.length > 0)

	async function createStudentAndOpen(input: CreateStudentInput) {
		if (!hasSchool.value) {
			await router.push('/app/setup-school')
			return null
		}
		const templateSetId = input.templateSetId || defaultAlphabeticalTemplateSetId.value
		if (!templateSetId) return null
		const templateSet = getSetData(templateSetId) ?? await loadSetData(templateSetId)

		const newId = addStudent({
			name: input.name.trim(),
			surname: input.surname.trim(),
			gender: input.gender,
			templateSetId,
			reportSelection: templateSet
				? buildDeactivatedReportSelection(templateSet)
				: { categories: {}, expandedCategoryIds: [] },
		})

		void router.push(`/app/students/${newId}`)
		return newId
	}

	return {
		canCreateStudent,
		createStudentAndOpen,
	}
}
