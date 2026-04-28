export type NamePartReplacementKey = 'erSie'
export type NamePartOverrides = Record<string, NamePartReplacementKey>

export interface ReportSelection {
	categories: Record<string, {
		gradeId: string | null
		variantIds: string[]
		optionalPartOverrides?: Record<string, boolean>
		namePartOverrides?: NamePartOverrides
	}>
	selectedSubjectId?: string
}

export interface Student {
	id: string
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId: string
	reportSelection?: ReportSelection
}
