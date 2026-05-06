import { describe, expect, it } from 'vitest'
import { TemplateClipboardPayloadSchema } from '~/schemas/template'
import type { Grade, SentencePart, Variant } from '~/types/template'
import {
	cloneClipboardItemsForPaste,
	createTemplateClipboardPayload,
} from '~/utils/templateClipboard'

const gradeId = '11111111-1111-1111-1111-111111111111'
const variantId = '22222222-2222-2222-2222-222222222222'
const optionalTextId = '33333333-3333-3333-3333-333333333333'

function makeVariant(): Variant {
	return {
		id: variantId,
		label: '1',
		sentences: [
			{ type: 'text', value: 'Starker Anfang' },
			{
				type: 'optionalText',
				id: optionalTextId,
				value: 'mit Zusatz',
				enabledByDefault: true,
			},
		],
	}
}

function makeGrade(): Grade {
	return {
		id: gradeId,
		label: '1',
		variants: [makeVariant()],
	}
}

describe('template clipboard helpers', () => {
	it('creates schema-valid clipboard payloads', () => {
		const payload = createTemplateClipboardPayload('grade', [makeGrade()], 'Mathe')

		expect(TemplateClipboardPayloadSchema.safeParse(payload).success).toBe(true)
		expect(payload.kind).toBe('grade')
		expect(payload.sourceLabel).toBe('Mathe')
	})

	it('regenerates nested IDs when cloning grades for paste', () => {
		const payload = createTemplateClipboardPayload('grade', [makeGrade()])
		const [cloned] = cloneClipboardItemsForPaste(payload) as Grade[]

		expect(cloned?.id).not.toBe(gradeId)
		expect(cloned?.variants[0]?.id).not.toBe(variantId)
		expect(cloned?.variants[0]?.sentences[1]).toMatchObject({
			type: 'optionalText',
			value: 'mit Zusatz',
			enabledByDefault: true,
		})
		const nestedOptionalText = cloned?.variants[0]?.sentences[1] as SentencePart & { id?: string }
		expect(nestedOptionalText.id).not.toBe(optionalTextId)
	})

	it('regenerates optional-text IDs when cloning sentence parts', () => {
		const part: SentencePart = {
			type: 'optionalText',
			id: optionalTextId,
			value: 'optional',
			enabledByDefault: false,
		}
		const payload = createTemplateClipboardPayload('sentencePart', [part])
		const [cloned] = cloneClipboardItemsForPaste(payload) as SentencePart[]

		expect(cloned).toMatchObject({
			type: 'optionalText',
			value: 'optional',
			enabledByDefault: false,
		})
		expect((cloned as SentencePart & { id?: string }).id).not.toBe(optionalTextId)
	})
})
