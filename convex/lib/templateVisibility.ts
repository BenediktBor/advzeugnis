import type { SchoolRole } from './auth'

export type TemplateSubjectData = {
	label: string
	hidden?: boolean
	categories: Array<{
		grades: Array<{
			variants: unknown[]
		}>
	}>
}

export type TemplateSetData = {
	id: string
	label: string
	hidden?: boolean
	subjects: TemplateSubjectData[]
	_schemaVersion?: number
}

export function canSeeHiddenTemplates(role: SchoolRole): boolean {
	return role === 'owner' || role === 'admin' || role === 'templateManager'
}

export function getVisibleSubjects(
	data: TemplateSetData,
	role: SchoolRole,
): TemplateSubjectData[] {
	if (canSeeHiddenTemplates(role)) return data.subjects
	return data.subjects.filter((subject) => !subject.hidden)
}

export function filterTemplateSetForRole(
	data: TemplateSetData,
	role: SchoolRole,
): TemplateSetData | null {
	if (!canSeeHiddenTemplates(role) && data.hidden) return null
	const subjects = getVisibleSubjects(data, role)
	return { ...data, subjects }
}

export function summarizeVisibleSubjects(
	data: TemplateSetData,
	role: SchoolRole,
) {
	const subjects = getVisibleSubjects(data, role)
	const subjectLabels = subjects.map((subject) => subject.label)
	const categoryCount = subjects.reduce(
		(total, subject) => total + subject.categories.length,
		0,
	)
	const gradeCount = subjects.reduce(
		(total, subject) =>
			total +
			subject.categories.reduce(
				(categoryTotal, category) => categoryTotal + category.grades.length,
				0,
			),
		0,
	)
	const variantCount = subjects.reduce(
		(total, subject) =>
			total +
			subject.categories.reduce(
				(categoryTotal, category) =>
					categoryTotal +
					category.grades.reduce(
						(gradeTotal, grade) => gradeTotal + grade.variants.length,
						0,
					),
				0,
			),
		0,
	)

	return {
		subjects: subjectLabels,
		subjectPreview: subjectLabels.slice(0, 4),
		remainingSubjectCount: Math.max(0, subjectLabels.length - 4),
		subjectCount: subjectLabels.length,
		categoryCount,
		gradeCount,
		variantCount,
	}
}
