import type { ZodType } from 'zod'

export type JsonParseResult<T> =
	| { ok: true; data: T }
	| { ok: false; reason: 'invalid-json' | 'invalid-schema' }

export function sanitizeExportFilenamePart(label: string, fallback: string): string {
	const normalized = label
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()

	return normalized || fallback
}

export function downloadJsonFile(payload: unknown, filename: string) {
	const json = JSON.stringify(payload, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)

	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

export function parseJsonText<T>(rawText: string, schema: ZodType<T>): JsonParseResult<T> {
	let payload: unknown

	try {
		payload = JSON.parse(rawText)
	} catch {
		return { ok: false, reason: 'invalid-json' }
	}

	const parsed = schema.safeParse(payload)
	if (!parsed.success) return { ok: false, reason: 'invalid-schema' }
	return { ok: true, data: parsed.data }
}

export async function readJsonFile<T>(
	file: Pick<File, 'text'>,
	schema: ZodType<T>,
): Promise<JsonParseResult<T>> {
	return parseJsonText(await file.text(), schema)
}
