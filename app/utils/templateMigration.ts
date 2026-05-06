import { randomId } from '~/utils/randomId'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function migrateSentencePartInput(part: unknown, parentKey?: string): unknown {
	if (!isRecord(part)) return part
	if (part.type === 'optionalText') {
		const value = typeof part.value === 'string' ? part.value : ''
		if (parentKey === 'parts') {
			return { type: 'text', value }
		}
		return {
			type: 'optionalGroup',
			id: typeof part.id === 'string' ? part.id : randomId(),
			enabledByDefault: typeof part.enabledByDefault === 'boolean' ? part.enabledByDefault : true,
			parts: [{ type: 'text', value }],
		}
	}
	if (part.type === 'optionalGroup' && Array.isArray(part.parts)) {
		return {
			...part,
			parts: part.parts.map((child) => migrateSentencePartInput(child, 'parts')),
		}
	}
	return part
}

function migrateTemplateNode(value: unknown, key?: string): unknown {
	if (Array.isArray(value)) {
		if (key === 'sentences' || key === 'parts') {
			return value.map((part) => migrateSentencePartInput(part, key))
		}
		return value.map((item) => migrateTemplateNode(item))
	}
	if (!isRecord(value)) return value
	return Object.fromEntries(
		Object.entries(value).map(([entryKey, entryValue]) => [
			entryKey,
			migrateTemplateNode(entryValue, entryKey),
		])
	)
}

export function migrateLegacyOptionalTextInput<T>(value: T): T {
	return migrateTemplateNode(value) as T
}
