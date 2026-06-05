import { describe, expect, it } from 'vitest'
import { TemplateClipboardPayloadSchema } from '~/schemas/template'
import type { Category, Grade, SentencePart, Subject, Variant } from '~/types/template'
import {
	cloneClipboardItemsForPaste,
	createTemplateClipboardPayload,
} from '~/utils/templateClipboard'

const gradeId = '11111111-1111-1111-1111-111111111111'
const variantId = '22222222-2222-2222-2222-222222222222'
const categoryId = '33333333-3333-3333-3333-333333333333'
const optionalGroupId = '44444444-4444-4444-4444-444444444444'
const subjectId = '55555555-5555-5555-5555-555555555555'

function makeVariant(): Variant {
	return {
		id: variantId,
		label: '1',
		sentences: [
			{ type: 'text', value: 'Starker Anfang' },
			{
				type: 'optionalGroup',
				id: optionalGroupId,
				enabledByDefault: false,
				parts: [
					{ type: 'text', value: 'Gruppentext' },
					{ type: 'name' },
				],
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

function makeCategory(): Category {
	return {
		id: categoryId,
		label: 'Rechnen',
		grades: [makeGrade()],
	}
}

function makeSubject(): Subject {
	return {
		id: subjectId,
		label: 'Mathe',
		categories: [makeCategory()],
	}
}

describe('template clipboard helpers', () => {
	it('creates schema-valid clipboard payloads', () => {
		const payload = createTemplateClipboardPayload('grade', [makeGrade()], 'Mathe')

		expect(TemplateClipboardPayloadSchema.safeParse(payload).success).toBe(true)
		expect(payload.kind).toBe('grade')
		expect(payload.sourceLabel).toBe('Mathe')
	})

	it('creates schema-valid subject and category clipboard payloads', () => {
		const subjectPayload = createTemplateClipboardPayload('subject', [makeSubject()], 'Klasse 1')
		const categoryPayload = createTemplateClipboardPayload('category', [makeCategory()], 'Mathe')

		expect(TemplateClipboardPayloadSchema.safeParse(subjectPayload).success).toBe(true)
		expect(TemplateClipboardPayloadSchema.safeParse(categoryPayload).success).toBe(true)
		expect(subjectPayload.kind).toBe('subject')
		expect(categoryPayload.kind).toBe('category')
	})

	it('regenerates nested IDs when cloning categories and subjects for paste', () => {
		const categoryPayload = createTemplateClipboardPayload('category', [makeCategory()])
		const [clonedCategory] = cloneClipboardItemsForPaste(categoryPayload) as Category[]

		expect(clonedCategory?.id).not.toBe(categoryId)
		expect(clonedCategory?.grades[0]?.id).not.toBe(gradeId)
		expect(clonedCategory?.grades[0]?.variants[0]?.id).not.toBe(variantId)
		const categoryGroup = clonedCategory?.grades[0]?.variants[0]?.sentences[1] as Extract<SentencePart, { type: 'optionalGroup' }>
		expect(categoryGroup.id).not.toBe(optionalGroupId)

		const subjectPayload = createTemplateClipboardPayload('subject', [makeSubject()])
		const [clonedSubject] = cloneClipboardItemsForPaste(subjectPayload) as Subject[]
		expect(clonedSubject?.id).not.toBe(subjectId)
		expect(clonedSubject?.categories[0]?.id).not.toBe(categoryId)
	})

	it('regenerates nested IDs when cloning grades for paste', () => {
		const payload = createTemplateClipboardPayload('grade', [makeGrade()])
		const [cloned] = cloneClipboardItemsForPaste(payload) as Grade[]

		expect(cloned?.id).not.toBe(gradeId)
		expect(cloned?.variants[0]?.id).not.toBe(variantId)
		const nestedGroup = cloned?.variants[0]?.sentences[1] as Extract<SentencePart, { type: 'optionalGroup' }>
		expect(nestedGroup.id).not.toBe(optionalGroupId)
		expect(nestedGroup.parts[1]).toMatchObject({
			type: 'name',
		})
	})

	it('regenerates optional group IDs when cloning sentence parts', () => {
		const part: SentencePart = {
			type: 'optionalGroup',
			id: optionalGroupId,
			enabledByDefault: true,
			parts: [{ type: 'text', value: 'nested' }],
		}
		const payload = createTemplateClipboardPayload('sentencePart', [part])
		const [cloned] = cloneClipboardItemsForPaste(payload) as SentencePart[]

		expect(cloned).toMatchObject({
			type: 'optionalGroup',
			enabledByDefault: true,
		})
		const clonedGroup = cloned as Extract<SentencePart, { type: 'optionalGroup' }>
		expect(clonedGroup.id).not.toBe(optionalGroupId)
		expect(clonedGroup.parts).toEqual([{ type: 'text', value: 'nested' }])
	})
})
