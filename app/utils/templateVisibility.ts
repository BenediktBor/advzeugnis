import type { SchoolRole } from '~/types/user'
import type { Subject, TemplateSet } from '~/types/template'

export function canSeeHiddenTemplates(role: SchoolRole): boolean {
	return role === 'owner' || role === 'admin' || role === 'templateManager'
}

export function getVisibleSubjects(templateSet: TemplateSet, canSeeHidden: boolean): Subject[] {
	if (canSeeHidden) return templateSet.subjects
	return templateSet.subjects.filter((subject) => !subject.hidden)
}

export function filterTemplateSetForRole(
	templateSet: TemplateSet,
	canSeeHidden: boolean,
): TemplateSet | null {
	if (!canSeeHidden && templateSet.hidden) return null
	return {
		...templateSet,
		subjects: getVisibleSubjects(templateSet, canSeeHidden),
	}
}

export function isTemplateSetVisibleToTeachers(templateSet: TemplateSet): boolean {
	return !templateSet.hidden
}

export function summarizeVisibleTemplateSet(
	templateSet: TemplateSet,
	canSeeHidden: boolean,
) {
	const subjects = getVisibleSubjects(templateSet, canSeeHidden)
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
	const subjectPreview = subjectLabels.slice(0, 4)

	return {
		subjects: subjectLabels,
		subjectPreview,
		remainingSubjectCount: Math.max(0, subjectLabels.length - subjectPreview.length),
		subjectCount: subjectLabels.length,
		categoryCount,
		gradeCount,
		variantCount,
	}
}
