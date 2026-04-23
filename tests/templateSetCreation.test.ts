import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import { get } from 'idb-keyval'

vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
}))

import { createTemplateSet, useTemplatesStore } from '~/stores/templates'
import { useTemplates, useTemplateSets } from '~/composables/useTemplates'

describe('template set creation', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).ref = ref
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).computed = computed
		setActivePinia(createPinia())
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('creates starter sets with the default scaffold', () => {
		const templateSet = createTemplateSet(
			'Klasse 5',
			'starter',
			'11111111-1111-1111-1111-111111111111',
		)

		expect(templateSet).toMatchObject({
			id: '11111111-1111-1111-1111-111111111111',
			label: 'Klasse 5',
		})
		expect(templateSet.subjects).toHaveLength(1)
		expect(templateSet.subjects[0]?.categories).toHaveLength(1)
		expect(templateSet.subjects[0]?.categories[0]?.grades).toHaveLength(1)
		expect(
			templateSet.subjects[0]?.categories[0]?.grades[0]?.variants,
		).toHaveLength(1)
	})

	it('creates empty sets without starter content', () => {
		const templateSet = createTemplateSet(
			'Klasse 6',
			'empty',
			'22222222-2222-2222-2222-222222222222',
		)

		expect(templateSet).toEqual({
			id: '22222222-2222-2222-2222-222222222222',
			label: 'Klasse 6',
			subjects: [],
		})
	})

	it('stores the requested creation mode when adding a set', () => {
		const store = useTemplatesStore()

		const starterId = store.addSet(' Klasse 7 ')
		const emptyId = store.addSet('Klasse 8', 'empty')

		expect(store.orderedIds).toEqual([starterId, emptyId])
		expect(store.record[starterId!]?.label).toBe('Klasse 7')
		expect(store.record[starterId!]?.subjects).toHaveLength(1)
		expect(store.record[emptyId!]).toEqual({
			id: emptyId,
			label: 'Klasse 8',
			subjects: [],
		})
	})

	it('keeps template storage empty on first load', async () => {
		vi.mocked(get).mockResolvedValue(undefined)
		const store = useTemplatesStore()

		await store.load()

		expect(store.orderedIds).toEqual([])
		expect(store.record).toEqual({})
		expect(store.isLoaded).toBe(true)
	})

	it('treats empty template sets as existing template sets', () => {
		const store = useTemplatesStore()
		store.load = vi.fn().mockResolvedValue(undefined)
		const emptyId = store.addSet('Klasse 9', 'empty')

		const { hasAnyTemplateSets } = useTemplateSets()

		expect(emptyId).toBeTruthy()
		expect(hasAnyTemplateSets.value).toBe(true)
	})

	it('reorders categories from the composable without proxy errors', () => {
		const store = useTemplatesStore()
		store.load = vi.fn().mockResolvedValue(undefined)
		const setId = '33333333-3333-3333-3333-333333333333'

		store.saveSetData(setId, {
			id: setId,
			label: 'Klasse 10',
			subjects: [
				{
					id: 'subject-a',
					label: 'Mathe',
					categories: [
						{ id: 'category-a', label: 'Algebra', grades: [] },
						{ id: 'category-b', label: 'Geometrie', grades: [] },
					],
				},
				{
					id: 'subject-b',
					label: 'Deutsch',
					categories: [],
				},
			],
		})

		const { reorderCategory } = useTemplates(setId)

		expect(() => reorderCategory('subject-a', 0, 0, 'subject-b')).not.toThrow()
		expect(
			store.getSetData(setId)?.subjects.find((subject) => subject.id === 'subject-a')?.categories,
		).toEqual([{ id: 'category-b', label: 'Geometrie', grades: [] }])
		expect(
			store.getSetData(setId)?.subjects.find((subject) => subject.id === 'subject-b')?.categories,
		).toEqual([{ id: 'category-a', label: 'Algebra', grades: [] }])
	})
})
