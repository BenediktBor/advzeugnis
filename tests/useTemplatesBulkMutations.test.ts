import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import type { TemplateSet } from '~/types/template'

vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
}))

import { useTemplates } from '~/composables/useTemplates'
import { useTemplatesStore } from '~/stores/templates'

const setId = '11111111-1111-1111-1111-111111111111'
const subjectId = '22222222-2222-2222-2222-222222222222'
const categoryId = '33333333-3333-3333-3333-333333333333'
const gradeId = '44444444-4444-4444-4444-444444444444'
const variantId = '55555555-5555-5555-5555-555555555555'

function makeTemplateSet(): TemplateSet {
	return {
		id: setId,
		label: 'Klasse 1',
		subjects: [
			{
				id: subjectId,
				label: 'Mathe',
				categories: [
					{
						id: categoryId,
						label: 'Rechnen',
						grades: [
							{
								id: gradeId,
								label: '1',
								variants: [
									{
										id: variantId,
										label: '1',
										sentences: [{ type: 'text', value: 'Bestehend' }],
									},
								],
							},
						],
					},
				],
			},
		],
	}
}

describe('useTemplates bulk mutations', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).ref = ref
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).computed = computed
		setActivePinia(createPinia())
	})

	it('inserts and removes grades, variants, and sentence parts', () => {
		const store = useTemplatesStore()
		store.saveSetData(setId, makeTemplateSet())
		const templates = useTemplates(ref(setId))

		templates.insertGrades(subjectId, categoryId, [
			{
				id: '66666666-6666-6666-6666-666666666666',
				label: '2',
				variants: [],
			},
		])
		expect(store.record[setId]?.subjects[0]?.categories[0]?.grades.map((grade) => grade.label)).toEqual(['1', '2'])

		templates.insertVariants(subjectId, categoryId, gradeId, [
			{
				id: '77777777-7777-7777-7777-777777777777',
				label: '2',
				sentences: [],
			},
		], 0)
		expect(store.record[setId]?.subjects[0]?.categories[0]?.grades[0]?.variants.map((variant) => variant.label)).toEqual(['2', '1'])

		templates.insertSentenceParts(subjectId, categoryId, gradeId, variantId, [
			{ type: 'text', value: 'Neu' },
		], 0)
		expect(store.record[setId]?.subjects[0]?.categories[0]?.grades[0]?.variants[1]?.sentences).toEqual([
			{ type: 'text', value: 'Neu' },
			{ type: 'text', value: 'Bestehend' },
		])

		templates.deleteSentenceParts(subjectId, categoryId, gradeId, variantId, [0])
		templates.deleteVariants(subjectId, categoryId, gradeId, ['77777777-7777-7777-7777-777777777777'])
		templates.deleteGrades(subjectId, categoryId, ['66666666-6666-6666-6666-666666666666'])

		expect(store.record[setId]).toEqual(makeTemplateSet())
	})
})
