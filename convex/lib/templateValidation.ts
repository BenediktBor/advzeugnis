import { ConvexError } from 'convex/values'

export const MAX_TEMPLATE_SETS_PER_SCHOOL = 100
const MAX_TEMPLATE_JSON_BYTES = 500_000
const MAX_LABEL_LENGTH = 160
const MAX_TEXT_LENGTH = 10_000
const MAX_SUBJECTS = 100
const MAX_CATEGORIES_PER_SUBJECT = 100
const MAX_GRADES_PER_CATEGORY = 30
const MAX_VARIANTS_PER_GRADE = 30
const MAX_SENTENCE_PARTS_PER_VARIANT = 500
const MAX_OPTIONAL_GROUP_PARTS = 100

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TemplateData = {
	id: string
	label: string
	subjects: Array<{
		id: string
		label: string
		categories: Array<{
			id: string
			label: string
			grades: Array<{
				id: string
				label: string
				value?: number
				variants: Array<{
					id: string
					label: string
					sentences: SentencePart[]
				}>
			}>
		}>
	}>
	_schemaVersion?: number
}

type SentencePart =
	| { type: 'text', value: string }
	| { type: 'genderVariant', value: string[] }
	| { type: 'name', value?: string }
	| { type: 'optionalGroup', id: string, enabledByDefault: boolean, parts: OptionalGroupChildPart[] }

type OptionalGroupChildPart =
	| { type: 'text', value: string }
	| { type: 'genderVariant', value: string[] }
	| { type: 'name', value?: string }

function assertUuid(value: string, field: string) {
	if (!uuidPattern.test(value)) throw new ConvexError(`${field} must be a UUID`)
}

function assertUniqueId(value: string, field: string, seenIds: Set<string>) {
	assertUuid(value, field)
	if (seenIds.has(value)) throw new ConvexError(`${field} must be unique`)
	seenIds.add(value)
}

function assertLabel(value: string, field: string) {
	const trimmed = value.trim()
	if (!trimmed) throw new ConvexError(`${field} is required`)
	if (trimmed.length > MAX_LABEL_LENGTH) throw new ConvexError(`${field} is too long`)
}

function assertText(value: string | undefined, field: string) {
	if (value !== undefined && value.length > MAX_TEXT_LENGTH) throw new ConvexError(`${field} is too long`)
}

function assertArrayLimit(items: unknown[], max: number, field: string) {
	if (items.length > max) throw new ConvexError(`${field} exceeds the allowed limit`)
}

function assertGenderVariantValue(value: string[], field: string) {
	if (value.length !== 2) throw new ConvexError(`${field} must contain exactly two variants`)
	assertText(value[0], `${field}[0]`)
	assertText(value[1], `${field}[1]`)
}

function validateChildPart(part: OptionalGroupChildPart, field: string) {
	if (part.type === 'text') {
		assertText(part.value, `${field}.value`)
		return
	}
	if (part.type === 'genderVariant') {
		assertGenderVariantValue(part.value, `${field}.value`)
		return
	}
	assertText(part.value, `${field}.value`)
}

function validateSentencePart(part: SentencePart, field: string, seenIds: Set<string>) {
	if (part.type === 'optionalGroup') {
		assertUniqueId(part.id, `${field}.id`, seenIds)
		assertArrayLimit(part.parts, MAX_OPTIONAL_GROUP_PARTS, `${field}.parts`)
		part.parts.forEach((child, index) => validateChildPart(child, `${field}.parts[${index}]`))
		return
	}
	validateChildPart(part, field)
}

export function validateTemplateInput(args: {
	templateId: string
	label: string
	data: TemplateData
}) {
	const seenIds = new Set<string>()
	assertUuid(args.templateId, 'templateId')
	assertLabel(args.label, 'label')
	if (args.data.id !== args.templateId) throw new ConvexError('Template data id must match templateId')
	if (args.data.label !== args.label) throw new ConvexError('Template data label must match label')
	if (args.data._schemaVersion !== undefined && !Number.isSafeInteger(args.data._schemaVersion)) {
		throw new ConvexError('_schemaVersion must be an integer')
	}

	const serialized = JSON.stringify(args.data)
	if (serialized.length > MAX_TEMPLATE_JSON_BYTES) throw new ConvexError('Template data is too large')

	assertUniqueId(args.data.id, 'data.id', seenIds)
	assertLabel(args.data.label, 'data.label')
	assertArrayLimit(args.data.subjects, MAX_SUBJECTS, 'subjects')
	args.data.subjects.forEach((subject, subjectIndex) => {
		assertUniqueId(subject.id, `subjects[${subjectIndex}].id`, seenIds)
		assertLabel(subject.label, `subjects[${subjectIndex}].label`)
		assertArrayLimit(subject.categories, MAX_CATEGORIES_PER_SUBJECT, `subjects[${subjectIndex}].categories`)
		subject.categories.forEach((category, categoryIndex) => {
			assertUniqueId(category.id, `subjects[${subjectIndex}].categories[${categoryIndex}].id`, seenIds)
			assertLabel(category.label, `subjects[${subjectIndex}].categories[${categoryIndex}].label`)
			assertArrayLimit(category.grades, MAX_GRADES_PER_CATEGORY, `subjects[${subjectIndex}].categories[${categoryIndex}].grades`)
			category.grades.forEach((grade, gradeIndex) => {
				const gradePath = `subjects[${subjectIndex}].categories[${categoryIndex}].grades[${gradeIndex}]`
				assertUniqueId(grade.id, `${gradePath}.id`, seenIds)
				assertLabel(grade.label, `${gradePath}.label`)
				if (grade.value !== undefined && !Number.isFinite(grade.value)) throw new ConvexError(`${gradePath}.value must be finite`)
				assertArrayLimit(grade.variants, MAX_VARIANTS_PER_GRADE, `${gradePath}.variants`)
				grade.variants.forEach((variant, variantIndex) => {
					const variantPath = `${gradePath}.variants[${variantIndex}]`
					assertUniqueId(variant.id, `${variantPath}.id`, seenIds)
					assertLabel(variant.label, `${variantPath}.label`)
					assertArrayLimit(variant.sentences, MAX_SENTENCE_PARTS_PER_VARIANT, `${variantPath}.sentences`)
					variant.sentences.forEach((part, partIndex) => validateSentencePart(part, `${variantPath}.sentences[${partIndex}]`, seenIds))
				})
			})
		})
	})
}

export function validateTemplateId(templateId: string) {
	assertUuid(templateId, 'templateId')
}

export function validateTemplateSetLimit(count: number) {
	if (count > MAX_TEMPLATE_SETS_PER_SCHOOL) throw new ConvexError('Too many template sets')
}
