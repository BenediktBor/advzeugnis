export interface ReportSelection {
	categories: Record<string, {
		gradeId: string | null
		variantIds: string[]
		optionalPartOverrides?: Record<string, boolean>
	}>
}

export interface Student {
	id: string
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId: string
	reportSelection?: ReportSelection
}
