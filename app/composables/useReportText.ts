import type { Student } from '~/types/student'
import type {
	Category,
	Grade,
	SentencePart,
	TemplateSet,
	Variant,
} from '~/types/template'

export interface ReportSegment {
	categoryId: string
	gradeId: string
	variantId: string
	text: string
}

export function getDefaultVariantIdsForGrade(grade: Grade): string[] {
	const firstVariant = grade.variants[0]
	return firstVariant ? [firstVariant.id] : []
}

export function normalizeVariantIdsForGrade(
	grade: Grade,
	variantIds: string[]
): string[] {
	const selectedIds = new Set(variantIds)
	return grade.variants
		.map((variant) => variant.id)
		.filter((variantId) => selectedIds.has(variantId))
}

export function ensureVariantIdsForGrade(
	grade: Grade,
	variantIds: string[]
): string[] {
	const normalizedVariantIds = normalizeVariantIdsForGrade(grade, variantIds)
	return normalizedVariantIds.length > 0
		? normalizedVariantIds
		: getDefaultVariantIdsForGrade(grade)
}

function resolveSentencePart(
	part: SentencePart,
	firstName: string,
	gender: 'male' | 'female'
): string {
	switch (part.type) {
		case 'text':
			return part.value ?? ''
		case 'genderVariant':
			return gender === 'male' ? part.value[0] ?? '' : part.value[1] ?? ''
		case 'name':
			// `name` parts optionally override the resolved student first name.
			// When `value` is missing, fall back to the student's first name.
			return part.value?.trim() ?? firstName
		default:
			return ''
	}
}

function resolveVariantToText(
	variant: Variant,
	firstName: string,
	gender: 'male' | 'female'
): string {
	return variant.sentences
		.map((p) => resolveSentencePart(p, firstName, gender))
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.join(' ')
}

export function buildVariantPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variant: Variant
): string {
	const firstName = student.name?.trim() ?? ''
	return resolveVariantToText(variant, firstName, student.gender)
}

export function buildVariantsPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variants: Variant[]
): string {
	return variants
		.map((variant) => buildVariantPreviewText(student, variant))
		.filter(Boolean)
		.join(' ')
}

export interface EffectiveCategoryEntry {
	gradeId: string
	variantIds: string[]
}

/**
 * Get effective selection for one category (defaults + clamping).
 * Returns null if the category has no grades or is explicitly excluded.
 */
export function getEffectiveCategoryEntry(
	student: Student,
	category: Category,
): EffectiveCategoryEntry | null {
	const categoriesState = student.reportSelection?.categories ?? {}
	const grades = category.grades
	if (grades.length === 0) return null

	const entry = categoriesState[category.id]

	if (entry?.gradeId === null) return null

	let grade: Grade | undefined
	if (entry?.gradeId) {
		grade = grades.find((g) => g.id === entry.gradeId)
	}
	if (!grade) grade = grades[0]
	if (!grade) return null

	const variants = grade.variants
	if (variants.length === 0) return null
	const firstVariant = variants[0]
	if (!firstVariant) return null

	let variantIds: string[]
	if (variants.length === 1) {
		variantIds = [firstVariant.id]
	} else if (entry?.variantIds) {
		variantIds = ensureVariantIdsForGrade(grade, entry.variantIds)
	} else {
		variantIds = getDefaultVariantIdsForGrade(grade)
	}

	return { gradeId: grade.id, variantIds }
}

export function buildReportSegments(
	student: Student,
	templateSet: TemplateSet
): ReportSegment[] {
	const firstName = student.name?.trim() ?? ''
	const gender = student.gender
	const segments: ReportSegment[] = []

	for (const subject of templateSet.subjects) {
		for (const category of subject.categories) {
			const effective = getEffectiveCategoryEntry(student, category)
			if (!effective || effective.variantIds.length === 0) continue

			const grade = category.grades.find((g) => g.id === effective.gradeId)
			if (!grade) continue
			const variants = grade.variants
			if (variants.length === 0) continue

			for (const vId of effective.variantIds) {
				const variant = variants.find((v) => v.id === vId)
				if (!variant) continue
				const text = buildVariantPreviewText({ name: firstName, gender }, variant)
				if (!text) continue
				segments.push({
					categoryId: category.id,
					gradeId: grade.id,
					variantId: variant.id,
					text,
				})
			}
		}
	}

	return segments
}

export function buildReportPlainText(
	student: Student,
	templateSet: TemplateSet
): string {
	return buildReportSegments(student, templateSet)
		.map((s) => s.text)
		.filter(Boolean)
		.join(' ')
}
