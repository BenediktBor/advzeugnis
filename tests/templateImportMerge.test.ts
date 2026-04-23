import { describe, expect, it } from 'vitest'
import type { AdvZeUExportPayload } from '~/schemas/template'
import {
	mergeAdvZeUIntoTemplateState,
	type TemplateStoreSnapshot,
} from '~/stores/templates'
import type { TemplateSet } from '~/types/template'

const setIdA = '11111111-1111-1111-1111-111111111111'
const setIdB = '22222222-2222-2222-2222-222222222222'
const setIdC = '33333333-3333-3333-3333-333333333333'

function makeTemplateSet(id: string, label: string, sentence: string): TemplateSet {
	return {
		id,
		label,
		subjects: [
			{
				id: `${id}-subject`,
				label: `${label} Fach`,
				categories: [
					{
						id: `${id}-category`,
						label: 'Kategorie',
						grades: [
							{
								id: `${id}-grade`,
								label: '1',
								variants: [
									{
										id: `${id}-variant`,
										label: '1',
										sentences: [{ type: 'text', value: sentence }],
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

describe('mergeAdvZeUIntoTemplateState', () => {
	it('keeps local-only sets, overwrites matching IDs, and appends new IDs in import order', () => {
		const current: TemplateStoreSnapshot = {
			record: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A'),
				[setIdB]: makeTemplateSet(setIdB, 'Klasse 2', 'Bestehend B'),
			},
			orderedIds: [setIdB, setIdA],
		}
		const payload: AdvZeUExportPayload = {
			schemaVersion: 1,
			orderedIds: [setIdC, setIdA],
			templateSets: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1 aktualisiert', 'Importiert A'),
				[setIdC]: makeTemplateSet(setIdC, 'Klasse 3', 'Importiert C'),
			},
		}

		const merged = mergeAdvZeUIntoTemplateState(current, payload)

		expect(merged.orderedIds).toEqual([setIdB, setIdA, setIdC])
		expect(Object.keys(merged.record)).toEqual([setIdA, setIdB, setIdC])
		expect(merged.record[setIdB]?.label).toBe('Klasse 2')
		expect(merged.record[setIdA]?.label).toBe('Klasse 1 aktualisiert')
		expect(
			merged.record[setIdA]?.subjects[0]?.categories[0]?.grades[0]?.variants[0]?.sentences[0],
		).toEqual({ type: 'text', value: 'Importiert A' })
		expect(merged.record[setIdC]?.label).toBe('Klasse 3')
	})

	it('treats an empty import payload as a no-op', () => {
		const current: TemplateStoreSnapshot = {
			record: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A'),
			},
			orderedIds: [setIdA],
		}
		const payload: AdvZeUExportPayload = {
			schemaVersion: 1,
			orderedIds: [],
			templateSets: {},
		}

		const merged = mergeAdvZeUIntoTemplateState(current, payload)

		expect(merged).toEqual(current)
	})
})
