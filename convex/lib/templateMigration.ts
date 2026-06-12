type UnknownRecord = Record<string, unknown>

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
	| { type: 'input', placeholder?: string }
	| { type: 'optionalGroup', id: string, enabledByDefault: boolean, parts: OptionalGroupChildPart[] }

type OptionalGroupChildPart =
	| { type: 'text', value: string }
	| { type: 'genderVariant', value: string[] }
	| { type: 'name', value?: string }
	| { type: 'input', placeholder?: string }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is UnknownRecord {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && uuidPattern.test(value)
}

function stringOr(value: unknown, fallback: string) {
	return typeof value === 'string' ? value : fallback
}

function uuidOr(value: unknown, fallback?: string) {
	return isUuid(value) ? value : fallback && isUuid(fallback) ? fallback : crypto.randomUUID()
}

function migrateChildPart(part: unknown): OptionalGroupChildPart {
	if (!isRecord(part)) return { type: 'text', value: '' }
	if (part.type === 'genderVariant') {
		const value = Array.isArray(part.value) ? part.value : []
		return { type: 'genderVariant', value: [stringOr(value[0], ''), stringOr(value[1], '')] }
	}
	if (part.type === 'name') {
		return typeof part.value === 'string'
			? { type: 'name', value: part.value }
			: { type: 'name' }
	}
	if (part.type === 'input') {
		return typeof part.placeholder === 'string'
			? { type: 'input', placeholder: part.placeholder }
			: { type: 'input' }
	}
	return { type: 'text', value: stringOr(part.value, '') }
}

function migrateSentencePart(part: unknown): SentencePart {
	if (!isRecord(part)) return { type: 'text', value: '' }
	if (part.type === 'optionalText') {
		return {
			type: 'optionalGroup',
			id: uuidOr(part.id),
			enabledByDefault: typeof part.enabledByDefault === 'boolean' ? part.enabledByDefault : true,
			parts: [{ type: 'text', value: stringOr(part.value, '') }],
		}
	}
	if (part.type === 'optionalGroup') {
		const parts = Array.isArray(part.parts) ? part.parts.map(migrateChildPart) : []
		return {
			type: 'optionalGroup',
			id: uuidOr(part.id),
			enabledByDefault: typeof part.enabledByDefault === 'boolean' ? part.enabledByDefault : true,
			parts,
		}
	}
	return migrateChildPart(part)
}

export function migrateLegacyTemplateData(
	value: unknown,
	fallbackTemplateId: string,
	fallbackLabel: string,
): TemplateData | null {
	if (!isRecord(value)) return null
	const templateId = uuidOr(value.id, fallbackTemplateId)
	const label = stringOr(value.label, fallbackLabel).trim() || fallbackLabel.trim() || 'Vorlage'
	const subjects = Array.isArray(value.subjects) ? value.subjects : []
	const migrated: TemplateData = {
		id: templateId,
		label,
		subjects: subjects
			.filter(isRecord)
			.map((subject, subjectIndex) => ({
				id: uuidOr(subject.id),
				label: stringOr(subject.label, `Fach ${subjectIndex + 1}`).trim() || `Fach ${subjectIndex + 1}`,
				categories: (Array.isArray(subject.categories) ? subject.categories : [])
					.filter(isRecord)
					.map((category, categoryIndex) => ({
						id: uuidOr(category.id),
						label: stringOr(category.label, `Kategorie ${categoryIndex + 1}`).trim() || `Kategorie ${categoryIndex + 1}`,
						grades: (Array.isArray(category.grades) ? category.grades : [])
							.filter(isRecord)
							.map((grade, gradeIndex) => ({
								id: uuidOr(grade.id),
								label: stringOr(grade.label, `${gradeIndex + 1}`).trim() || `${gradeIndex + 1}`,
								...(typeof grade.value === 'number' && Number.isFinite(grade.value) ? { value: grade.value } : {}),
								variants: (Array.isArray(grade.variants) ? grade.variants : [])
									.filter(isRecord)
									.map((variant, variantIndex) => ({
										id: uuidOr(variant.id),
										label: stringOr(variant.label, `${variantIndex + 1}`).trim() || `${variantIndex + 1}`,
										sentences: (Array.isArray(variant.sentences) ? variant.sentences : []).map(migrateSentencePart),
									})),
							})),
					})),
			})),
	}
	if (typeof value._schemaVersion === 'number' && Number.isFinite(value._schemaVersion)) {
		migrated._schemaVersion = value._schemaVersion
	}
	return migrated
}
