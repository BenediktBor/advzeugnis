import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import { get, set } from 'idb-keyval'
import type { TemplateSet } from '~/types/template'

vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
}))

import { createTemplateSet, useTemplatesStore } from '~/stores/templates'
import { useTemplates, useTemplateSets } from '~/composables/useTemplates'

const TEMPLATE_STORAGE_KEY = 'template-sets'
const TEMPLATE_LIST_STORAGE_KEY = 'template-set-list'

function makeTemplateSet(id: string, label = 'Klasse 1'): TemplateSet {
	return {
		id,
		label,
		subjects: [],
	}
}

describe('template set creation', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).ref = ref
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).computed = computed
		setActivePinia(createPinia())
		vi.mocked(get).mockReset()
		vi.mocked(set).mockClear()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('creates empty sets without initial content', () => {
		const templateSet = createTemplateSet(
			'Klasse 5',
			'11111111-1111-1111-1111-111111111111',
		)

		expect(templateSet).toEqual({
			id: '11111111-1111-1111-1111-111111111111',
			label: 'Klasse 5',
			subjects: [],
		})
	})

	it('uses the provided ID when creating an empty set', () => {
		const templateSet = createTemplateSet(
			'Klasse 6',
			'22222222-2222-2222-2222-222222222222',
		)

		expect(templateSet).toEqual({
			id: '22222222-2222-2222-2222-222222222222',
			label: 'Klasse 6',
			subjects: [],
		})
	})

	it('stores empty template sets when adding a set', () => {
		const store = useTemplatesStore()

		const firstId = store.addSet(' Klasse 7 ')
		const secondId = store.addSet('Klasse 8')

		expect(store.orderedIds).toEqual([firstId, secondId])
		expect(store.record[firstId!]).toEqual({
			id: firstId,
			label: 'Klasse 7',
			subjects: [],
		})
		expect(store.record[secondId!]).toEqual({
			id: secondId,
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
		expect(store.loadError).toBeNull()
	})

	it('aligns persisted ordered IDs with sanitized UUID-keyed records', async () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const missingListId = '22222222-2222-2222-2222-222222222222'
		const mismatchedSetId = '33333333-3333-3333-3333-333333333333'
		vi.mocked(get).mockImplementation(async (key) => {
			if (key === TEMPLATE_STORAGE_KEY) {
				return {
					[setId]: makeTemplateSet(mismatchedSetId, 'Klasse 5'),
				}
			}
			if (key === TEMPLATE_LIST_STORAGE_KEY) {
				return [missingListId, setId]
			}
			return undefined
		})
		const store = useTemplatesStore()

		await store.load()

		expect(store.record[setId]).toEqual(makeTemplateSet(setId, 'Klasse 5'))
		expect(store.orderedIds).toEqual([setId])
		expect(store.orderedIds.every((id) => id in store.record)).toBe(true)
		expect(Object.keys(store.record).every((id) => store.orderedIds.includes(id))).toBe(true)
	})

	it('drops invalid persisted sets and removes them from ordering', async () => {
		const validSetId = '44444444-4444-4444-4444-444444444444'
		const invalidSetId = '55555555-5555-5555-5555-555555555555'
		vi.mocked(get).mockImplementation(async (key) => {
			if (key === TEMPLATE_STORAGE_KEY) {
				return {
					[validSetId]: makeTemplateSet(validSetId, 'Klasse 6'),
					[invalidSetId]: {
						...makeTemplateSet(invalidSetId, 'Defekt'),
						subjects: [{ id: 'not-a-uuid', label: 'Kaputt', categories: [] }],
					},
				}
			}
			if (key === TEMPLATE_LIST_STORAGE_KEY) {
				return [invalidSetId, validSetId]
			}
			return undefined
		})
		const store = useTemplatesStore()

		await store.load()

		expect(store.record).toEqual({
			[validSetId]: makeTemplateSet(validSetId, 'Klasse 6'),
		})
		expect(store.orderedIds).toEqual([validSetId])
	})

	it('migrates legacy label-keyed records to set IDs', async () => {
		const setId = '66666666-6666-6666-6666-666666666666'
		vi.mocked(get).mockImplementation(async (key) => {
			if (key === TEMPLATE_STORAGE_KEY) {
				return {
					'Klasse 7': makeTemplateSet(setId, 'Klasse 7'),
				}
			}
			if (key === TEMPLATE_LIST_STORAGE_KEY) return ['ignored-legacy-order']
			return undefined
		})
		const store = useTemplatesStore()

		await store.load()

		expect(store.record).toEqual({
			[setId]: makeTemplateSet(setId, 'Klasse 7'),
		})
		expect(store.orderedIds).toEqual([setId])
	})

	it('exposes storage load failures separately from empty data', async () => {
		const error = new Error('IndexedDB unavailable')
		vi.mocked(get).mockRejectedValue(error)
		const store = useTemplatesStore()

		await store.load()

		expect(store.record).toEqual({})
		expect(store.orderedIds).toEqual([])
		expect(store.isLoaded).toBe(true)
		expect(store.loadError).toBe(error)
	})

	it('treats empty template sets as existing template sets', () => {
		const store = useTemplatesStore()
		store.load = vi.fn().mockResolvedValue(undefined)
		const emptyId = store.addSet('Klasse 9')

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
					id: '44444444-4444-4444-4444-444444444444',
					label: 'Mathe',
					categories: [
						{ id: '55555555-5555-5555-5555-555555555555', label: 'Algebra', grades: [] },
						{ id: '66666666-6666-6666-6666-666666666666', label: 'Geometrie', grades: [] },
					],
				},
				{
					id: '77777777-7777-7777-7777-777777777777',
					label: 'Deutsch',
					categories: [],
				},
			],
		})

		const { reorderCategory } = useTemplates(setId)

		expect(() =>
			reorderCategory(
				'44444444-4444-4444-4444-444444444444',
				0,
				0,
				'77777777-7777-7777-7777-777777777777',
			)
		).not.toThrow()
		expect(
			store.getSetData(setId)?.subjects.find((subject) =>
				subject.id === '44444444-4444-4444-4444-444444444444'
			)?.categories,
		).toEqual([{ id: '66666666-6666-6666-6666-666666666666', label: 'Geometrie', grades: [] }])
		expect(
			store.getSetData(setId)?.subjects.find((subject) =>
				subject.id === '77777777-7777-7777-7777-777777777777'
			)?.categories,
		).toEqual([{ id: '55555555-5555-5555-5555-555555555555', label: 'Algebra', grades: [] }])
	})
})
