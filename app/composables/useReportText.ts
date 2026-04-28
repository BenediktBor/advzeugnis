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

export type OptionalPartOverrides = Record<string, boolean>

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
	gender: 'male' | 'female',
	optionalPartOverrides: OptionalPartOverrides = {}
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
		case 'optionalText':
			return isOptionalPartEnabled(part, optionalPartOverrides) ? part.value : ''
		default:
			return ''
	}
}

export function isOptionalPartEnabled(
	part: Extract<SentencePart, { type: 'optionalText' }>,
	optionalPartOverrides: OptionalPartOverrides = {}
): boolean {
	return optionalPartOverrides[part.id] ?? part.enabledByDefault
}

function ensureFinalPunctuation(text: string): string {
	const trimmed = text.trim()
	if (!trimmed || /[.!?]$/.test(trimmed)) return trimmed
	return `${trimmed}.`
}

function resolveVariantToText(
	variant: Variant,
	firstName: string,
	gender: 'male' | 'female',
	optionalPartOverrides: OptionalPartOverrides = {}
): string {
	const text = variant.sentences
		.map((p) => resolveSentencePart(p, firstName, gender, optionalPartOverrides))
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.join(' ')
	return ensureFinalPunctuation(text)
}

export function buildVariantPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variant: Variant,
	optionalPartOverrides: OptionalPartOverrides = {}
): string {
	const firstName = student.name?.trim() ?? ''
	return resolveVariantToText(variant, firstName, student.gender, optionalPartOverrides)
}

export function buildVariantsPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variants: Variant[],
	optionalPartOverrides: OptionalPartOverrides = {}
): string {
	return variants
		.map((variant) => buildVariantPreviewText(student, variant, optionalPartOverrides))
		.filter(Boolean)
		.join(' ')
}

export interface EffectiveCategoryEntry {
	gradeId: string
	variantIds: string[]
	optionalPartOverrides?: OptionalPartOverrides
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

	const result: EffectiveCategoryEntry = { gradeId: grade.id, variantIds }
	if (entry?.optionalPartOverrides) {
		result.optionalPartOverrides = entry.optionalPartOverrides
	}
	return result
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
				const text = buildVariantPreviewText(
					{ name: firstName, gender },
					variant,
					effective.optionalPartOverrides
				)
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
