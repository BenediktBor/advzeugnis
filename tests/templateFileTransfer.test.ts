import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
	parseJsonText,
	readJsonFile,
	sanitizeExportFilenamePart,
} from '~/utils/templateFileTransfer'

const PayloadSchema = z.object({
	schemaVersion: z.literal(1),
	label: z.string(),
})

describe('template file transfer helpers', () => {
	it('parses schema-valid JSON text', () => {
		const parsed = parseJsonText(
			JSON.stringify({ schemaVersion: 1, label: 'Klasse 1' }),
			PayloadSchema,
		)

		expect(parsed).toEqual({
			ok: true,
			data: { schemaVersion: 1, label: 'Klasse 1' },
		})
	})

	it('reports invalid JSON separately from schema failures', async () => {
		expect(parseJsonText('{', PayloadSchema)).toEqual({
			ok: false,
			reason: 'invalid-json',
		})

		const parsed = await readJsonFile(
			{ text: () => Promise.resolve(JSON.stringify({ schemaVersion: 2, label: 'Klasse 1' })) },
			PayloadSchema,
		)

		expect(parsed).toEqual({
			ok: false,
			reason: 'invalid-schema',
		})
	})

	it('sanitizes export filenames with a fallback', () => {
		expect(sanitizeExportFilenamePart('Fächer: Klasse 5/6', 'fach')).toBe('facher-klasse-5-6')
		expect(sanitizeExportFilenamePart('---', 'fach')).toBe('fach')
	})
})
