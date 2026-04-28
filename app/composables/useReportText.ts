import type { NamePartOverrides, NamePartReplacementKey, Student } from '~/types/student'
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

type Gender = Student['gender']
type GenderVariantValue = readonly [string, string]

export const NAME_PART_REPLACEMENTS = {
	erSie: {
		label: 'Er/Sie',
		sentenceStart: ['Er', 'Sie'],
		inline: ['er', 'sie'],
	},
} as const satisfies Record<
	NamePartReplacementKey,
	{ label: string; sentenceStart: GenderVariantValue; inline: GenderVariantValue }
>

export function namePartOverrideKey(variantId: string, partIndex: number): string {
	return `${variantId}:${partIndex}`
}

export function resolveGenderVariantValue(
	value: GenderVariantValue,
	gender: Gender
): string {
	return gender === 'male' ? value[0] ?? '' : value[1] ?? ''
}

function isNextResolvedPartSentenceStart(resolvedParts: string[]): boolean {
	const previousText = resolvedParts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ')
	if (!previousText) return true
	return /[.!?]$/.test(previousText)
}

export function resolveNamePartReplacement(
	replacementKey: NamePartReplacementKey,
	gender: Gender,
	isSentenceStart: boolean
): string {
	const replacement = NAME_PART_REPLACEMENTS[replacementKey]
	const value = isSentenceStart ? replacement.sentenceStart : replacement.inline
	return resolveGenderVariantValue(value, gender)
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
	variantId: string,
	partIndex: number,
	firstName: string,
	gender: Gender,
	optionalPartOverrides: OptionalPartOverrides = {},
	namePartOverrides: NamePartOverrides = {},
	isSentenceStart = false
): string {
	switch (part.type) {
		case 'text':
			return part.value ?? ''
		case 'genderVariant':
			return resolveGenderVariantValue(part.value, gender)
		case 'name': {
			const replacementKey = namePartOverrides[namePartOverrideKey(variantId, partIndex)]
			if (replacementKey) {
				return resolveNamePartReplacement(replacementKey, gender, isSentenceStart)
			}
			// `name` parts optionally override the resolved student first name.
			// When `value` is missing, fall back to the student's first name.
			return part.value?.trim() ?? firstName
		}
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
	gender: Gender,
	optionalPartOverrides: OptionalPartOverrides = {},
	namePartOverrides: NamePartOverrides = {}
): string {
	const resolvedParts: string[] = []
	for (const [partIndex, part] of variant.sentences.entries()) {
		const text = resolveSentencePart(
			part,
			variant.id,
			partIndex,
			firstName,
			gender,
			optionalPartOverrides,
			namePartOverrides,
			isNextResolvedPartSentenceStart(resolvedParts)
		).trim()
		if (text) resolvedParts.push(text)
	}
	const text = resolvedParts.join(' ')
	return ensureFinalPunctuation(text)
}

export function buildVariantPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variant: Variant,
	optionalPartOverrides: OptionalPartOverrides = {},
	namePartOverrides: NamePartOverrides = {}
): string {
	const firstName = student.name?.trim() ?? ''
	return resolveVariantToText(
		variant,
		firstName,
		student.gender,
		optionalPartOverrides,
		namePartOverrides
	)
}

export function buildVariantsPreviewText(
	student: Pick<Student, 'name' | 'gender'>,
	variants: Variant[],
	optionalPartOverrides: OptionalPartOverrides = {},
	namePartOverrides: NamePartOverrides = {}
): string {
	return variants
		.map((variant) =>
			buildVariantPreviewText(student, variant, optionalPartOverrides, namePartOverrides)
		)
		.filter(Boolean)
		.join(' ')
}

export interface EffectiveCategoryEntry {
	gradeId: string
	variantIds: string[]
	optionalPartOverrides?: OptionalPartOverrides
	namePartOverrides?: NamePartOverrides
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
	if (entry?.namePartOverrides) {
		result.namePartOverrides = entry.namePartOverrides
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
					effective.optionalPartOverrides,
					effective.namePartOverrides
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
