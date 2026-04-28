import { describe, expect, it } from 'vitest'
import type { AzSetExportPayload } from '~/schemas/template'
import {
	createSingleSetAzsetPayload,
	mergeAzSetIntoTemplateState,
	mergeSubjectIntoTemplateSet,
	type TemplateStoreSnapshot,
} from '~/stores/templates'
import type { Subject, TemplateSet } from '~/types/template'

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

function makeSubject(id: string, label: string, sentence: string): Subject {
	return {
		id,
		label,
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
	}
}

describe('mergeAzSetIntoTemplateState', () => {
	it('keeps local-only sets, overwrites matching IDs, and appends new IDs in import order', () => {
		const current: TemplateStoreSnapshot = {
			record: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A'),
				[setIdB]: makeTemplateSet(setIdB, 'Klasse 2', 'Bestehend B'),
			},
			orderedIds: [setIdB, setIdA],
		}
		const payload: AzSetExportPayload = {
			schemaVersion: 1,
			orderedIds: [setIdC, setIdA],
			templateSets: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1 aktualisiert', 'Importiert A'),
				[setIdC]: makeTemplateSet(setIdC, 'Klasse 3', 'Importiert C'),
			},
		}

		const merged = mergeAzSetIntoTemplateState(current, payload)

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
		const payload: AzSetExportPayload = {
			schemaVersion: 1,
			orderedIds: [],
			templateSets: {},
		}

		const merged = mergeAzSetIntoTemplateState(current, payload)

		expect(merged).toEqual(current)
	})
})

describe('createSingleSetAzsetPayload', () => {
	it('exports only the requested template set as an azset payload', () => {
		const current: TemplateStoreSnapshot = {
			record: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A'),
				[setIdB]: makeTemplateSet(setIdB, 'Klasse 2', 'Bestehend B'),
			},
			orderedIds: [setIdB, setIdA],
		}

		const payload = createSingleSetAzsetPayload(current, setIdA)

		expect(payload).toEqual({
			schemaVersion: 1,
			orderedIds: [setIdA],
			templateSets: {
				[setIdA]: current.record[setIdA],
			},
		})
		expect(payload?.templateSets[setIdB]).toBeUndefined()
		expect(payload?.templateSets[setIdA]).not.toBe(current.record[setIdA])
	})

	it('returns null when the template set is missing', () => {
		const current: TemplateStoreSnapshot = {
			record: {
				[setIdA]: makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A'),
			},
			orderedIds: [setIdA],
		}

		expect(createSingleSetAzsetPayload(current, setIdB)).toBeNull()
	})
})

describe('mergeSubjectIntoTemplateSet', () => {
	it('appends a subject when there is no ID collision', () => {
		const currentSet = makeTemplateSet(setIdA, 'Klasse 1', 'Bestehend A')
		const incomingSubject = makeSubject('new-subject', 'Sport', 'Importiert Sport')

		const merged = mergeSubjectIntoTemplateSet(currentSet, incomingSubject, 'duplicate')

		expect(merged.result.action).toBe('appended')
		expect(merged.setData.subjects).toHaveLength(2)
		expect(merged.setData.subjects[1]).toEqual(incomingSubject)
	})

	it('replaces the existing subject when IDs collide and replace is chosen', () => {
		const currentSet: TemplateSet = {
			id: setIdA,
			label: 'Klasse 1',
			subjects: [makeSubject('subject-1', 'Mathe', 'Bestehend')],
		}
		const incomingSubject = makeSubject('subject-1', 'Mathe neu', 'Importiert')

		const merged = mergeSubjectIntoTemplateSet(currentSet, incomingSubject, 'replace')

		expect(merged.result.action).toBe('replaced')
		expect(merged.setData.subjects).toHaveLength(1)
		expect(merged.setData.subjects[0]).toEqual(incomingSubject)
	})

	it('duplicates with fresh IDs when IDs collide and duplicate is chosen', () => {
		const currentSet: TemplateSet = {
			id: setIdA,
			label: 'Klasse 1',
			subjects: [makeSubject('subject-1', 'Mathe', 'Bestehend')],
		}
		const incomingSubject = makeSubject('subject-1', 'Mathe importiert', 'Importiert')

		const merged = mergeSubjectIntoTemplateSet(currentSet, incomingSubject, 'duplicate')
		const duplicated = merged.setData.subjects[1]

		expect(merged.result.action).toBe('duplicated')
		expect(merged.setData.subjects).toHaveLength(2)
		expect(duplicated?.id).not.toBe(incomingSubject.id)
		expect(duplicated?.categories[0]?.id).not.toBe(incomingSubject.categories[0]?.id)
		expect(duplicated?.categories[0]?.grades[0]?.id).not.toBe(
			incomingSubject.categories[0]?.grades[0]?.id,
		)
		expect(duplicated?.categories[0]?.grades[0]?.variants[0]?.id).not.toBe(
			incomingSubject.categories[0]?.grades[0]?.variants[0]?.id,
		)
		expect(duplicated?.label).toBe(incomingSubject.label)
	})
})
