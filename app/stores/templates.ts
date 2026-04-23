import { defineStore } from 'pinia'
import { produce } from 'immer'
import { idbGet, createDebouncedPersist } from '~/utils/idbStorage'
import { TemplateSetSchema, type AdvZeUExportPayload } from '~/schemas/template'
import { randomId } from '~/utils/randomId'
import type { TemplateSet } from '~/types/template'
import { TEMPLATE_SET_LABELS } from '~/types/template'

const STORAGE_KEY = 'template-sets'
const LIST_STORAGE_KEY = 'template-set-list'
export type TemplateSetCreationMode = 'starter' | 'empty'

function createDefaultSet(label: string, id: string = randomId()): TemplateSet {
	return {
		id,
		label,
		subjects: [
			{
				id: randomId(),
				label: 'Fach',
				categories: [
					{
						id: randomId(),
						label: 'Kategorie',
						grades: [
							{
								id: randomId(),
								label: '1',
								variants: [{ id: randomId(), label: '1', sentences: [] }],
							},
						],
					},
				],
			},
		],
	}
}

function createEmptySet(id: string, label = 'Neue Vorlage'): TemplateSet {
	return {
		id,
		label,
		subjects: [],
	}
}

export function createTemplateSet(
	label: string,
	mode: TemplateSetCreationMode = 'starter',
	id: string = randomId(),
): TemplateSet {
	return mode === 'empty'
		? createEmptySet(id, label)
		: createDefaultSet(label, id)
}

function migrateTemplateSet(set: TemplateSet): TemplateSet {
	let needsMigration = false
	if (!set.id) needsMigration = true
	if (!needsMigration) {
		outer: for (const s of set.subjects) {
			if (!s.id) { needsMigration = true; break }
			for (const c of s.categories) {
				if (!c.id) { needsMigration = true; break outer }
				for (const g of c.grades) {
					if (!g.id) { needsMigration = true; break outer }
					for (const v of g.variants) {
						if (!v.id) { needsMigration = true; break outer }
					}
				}
			}
		}
	}
	if (!needsMigration) return set

	return produce(set, (draft) => {
		if (!draft.id) draft.id = randomId()
		for (const s of draft.subjects) {
			if (!s.id) s.id = randomId()
			for (const c of s.categories) {
				if (!c.id) c.id = randomId()
				for (const g of c.grades) {
					if (!g.id) g.id = randomId()
					for (const v of g.variants) {
						if (!v.id) v.id = randomId()
					}
				}
			}
		}
	})
}

type TemplateSetsRecord = Record<string, TemplateSet>

type NormalizeTemplateSetsResult = {
	record: TemplateSetsRecord
	orderedIds: string[]
	didMigrate: boolean
}

export type TemplateStoreSnapshot = {
	record: TemplateSetsRecord
	orderedIds: string[]
}

export function sanitizeTemplateSetsRecord(record: TemplateSetsRecord): TemplateSetsRecord {
	const repaired: TemplateSetsRecord = {}

	for (const [setId, set] of Object.entries(record)) {
		const parsed = TemplateSetSchema.safeParse(set)
		if (parsed.success) {
			repaired[setId] = parsed.data as TemplateSet
			continue
		}

		console.warn(`[templates] Dropping invalid template set "${setId}":`, parsed.error.issues)
	}

	return repaired
}

function normalizeTemplateSets(
	raw: Record<string, TemplateSet | null | undefined>,
	orderedIdsHint: string[] | undefined,
	opts: { addDefaultsIfEmpty: boolean; schemaSafeParse: boolean },
): NormalizeTemplateSetsResult {
	const migrated: TemplateSetsRecord = {}
	let record: TemplateSetsRecord = migrated
	let orderedIds: string[] = []
	let didMigrate = false
	const safeOrderedIdsHint = Array.isArray(orderedIdsHint)
		? orderedIdsHint.filter((id): id is string => typeof id === 'string')
		: []

	const isLabelKeyed = Object.keys(raw).some((k) => !isUuid(k))

	if (isLabelKeyed) {
		didMigrate = true
		const newIds: string[] = []
		for (const [_label, set] of Object.entries(raw)) {
			if (!set) continue
			const m = migrateTemplateSet(set)
			migrated[m.id] = m
			newIds.push(m.id)
		}
		record = migrated
		orderedIds = newIds
	} else {
		for (const [key, set] of Object.entries(raw)) {
			if (!set) continue
			const m = migrateTemplateSet(set)
			const normalized =
				m.id === key
					? m
					: produce(m, (draft) => {
							draft.id = key
						})
			migrated[key] = normalized
			if (normalized !== set) didMigrate = true
		}

		if (opts.schemaSafeParse) {
			record = sanitizeTemplateSetsRecord(migrated)
			if (Object.keys(record).length !== Object.keys(migrated).length) {
				didMigrate = true
			}
		} else {
			record = migrated
		}

		orderedIds = safeOrderedIdsHint.length > 0
			? safeOrderedIdsHint
			: Object.keys(migrated)
	}

	const validIds = new Set(Object.keys(record))
	const oldOrderedIds = [...orderedIds]
	const normalizedOrderedIds = oldOrderedIds.filter((id) => validIds.has(id))
	for (const id of validIds) {
		if (!normalizedOrderedIds.includes(id)) normalizedOrderedIds.push(id)
	}

	if (normalizedOrderedIds.length !== oldOrderedIds.length ||
		normalizedOrderedIds.some((id, idx) => oldOrderedIds[idx] !== id)
	) {
		orderedIds = normalizedOrderedIds
		didMigrate = true
	}

	if (
		opts.addDefaultsIfEmpty &&
		orderedIds.length === 0 &&
		Object.keys(record).length === 0
	) {
		const defaults = TEMPLATE_SET_LABELS.map((label) => createDefaultSet(label as string))
		const nextRecord: TemplateSetsRecord = {}
		for (const d of defaults) nextRecord[d.id] = d
		record = nextRecord
		orderedIds = defaults.map((d) => d.id)
		didMigrate = true
	}

	return { record, orderedIds, didMigrate }
}

function alignOrderedIdsWithRecord(record: TemplateSetsRecord, orderedIdsHint: string[]): string[] {
	const validIds = new Set(Object.keys(record))
	const seen = new Set<string>()
	const orderedIds: string[] = []

	for (const id of orderedIdsHint) {
		if (!validIds.has(id) || seen.has(id)) continue
		seen.add(id)
		orderedIds.push(id)
	}

	for (const id of Object.keys(record)) {
		if (seen.has(id)) continue
		seen.add(id)
		orderedIds.push(id)
	}

	return orderedIds
}

export function mergeAdvZeUIntoTemplateState(
	current: TemplateStoreSnapshot,
	payload: AdvZeUExportPayload,
): TemplateStoreSnapshot {
	const normalizedIncoming = normalizeTemplateSets(
		payload.templateSets as Record<string, TemplateSet | null | undefined>,
		payload.orderedIds,
		{ addDefaultsIfEmpty: false, schemaSafeParse: false },
	)

	const nextRecord: TemplateSetsRecord = {
		...current.record,
		...normalizedIncoming.record,
	}
	const existingOrderedIds = alignOrderedIdsWithRecord(current.record, current.orderedIds)
	const appendedIncomingIds = normalizedIncoming.orderedIds.filter(
		(setId) => !existingOrderedIds.includes(setId),
	)

	return {
		record: nextRecord,
		orderedIds: alignOrderedIdsWithRecord(nextRecord, [
			...existingOrderedIds,
			...appendedIncomingIds,
		]),
	}
}

export const useTemplatesStore = defineStore('templates', () => {
	const record = ref<TemplateSetsRecord>({})
	const orderedIds = ref<string[]>([])
	const isLoaded = ref(false)
	const { persist: debouncedPersistRecord } = createDebouncedPersist<TemplateSetsRecord>(STORAGE_KEY)
	const { persist: debouncedPersistList } = createDebouncedPersist<string[]>(LIST_STORAGE_KEY)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const [stored, storedList] = await Promise.all([
			idbGet<Record<string, TemplateSet>>(STORAGE_KEY),
			idbGet<string[]>(LIST_STORAGE_KEY),
		])

		const normalized = normalizeTemplateSets(
			(stored ?? {}) as Record<string, TemplateSet | null | undefined>,
			storedList,
			{ addDefaultsIfEmpty: false, schemaSafeParse: true },
		)

		record.value = normalized.record
		orderedIds.value = normalized.orderedIds
		isLoaded.value = true
		if (normalized.didMigrate) {
			debouncedPersistRecord(record.value)
			debouncedPersistList(orderedIds.value)
		}
	}

	function persistRecord() {
		debouncedPersistRecord(record.value)
	}

	function persistList() {
		debouncedPersistList(orderedIds.value)
	}

	function upsertSet(setId: string, setData: TemplateSet) {
		// Keep the store invariant:
		// `record[setId]` should always contain a set whose `id` equals `setId`.
		const normalizedSet =
			setData.id === setId
				? setData
				: produce(setData, (draft) => {
						draft.id = setId
					})

		const listChanged = !orderedIds.value.includes(setId)
		record.value = { ...record.value, [setId]: normalizedSet }
		if (listChanged) {
			orderedIds.value = [...orderedIds.value, setId]
			persistList()
		}
		persistRecord()
	}

	function addSet(label: string, mode: TemplateSetCreationMode = 'starter'): string {
		const trimmed = label.trim()
		if (!trimmed) return ''
		const newSet = createTemplateSet(trimmed, mode)
		upsertSet(newSet.id, newSet)
		return newSet.id
	}

	function removeSet(setId: string) {
		if (!setId) return

		const listChanged = orderedIds.value.includes(setId)
		if (listChanged) {
			orderedIds.value = orderedIds.value.filter((id) => id !== setId)
			persistList()
		}

		const recordChanged = Object.prototype.hasOwnProperty.call(record.value, setId)
		if (recordChanged) {
			const { [setId]: _, ...rest } = record.value
			record.value = rest
			persistRecord()
		}
	}

	function getSetData(setId: string): TemplateSet | null {
		return record.value[setId] ?? null
	}

	function ensureSet(setId: string, label = 'Neue Vorlage') {
		const existing = getSetData(setId)
		if (existing) return existing

		const created = createEmptySet(setId, label)
		upsertSet(setId, created)
		return created
	}

	function saveSetData(setId: string, setData: TemplateSet) {
		upsertSet(setId, setData)
	}

	function getSetLabel(setId: string): string {
		return record.value[setId]?.label ?? ''
	}

	async function exportAllAdvzeu() {
		await load()

		// Export a plain JSON object (avoid Vue/Pinia reactivity).
		const templateSets: TemplateSetsRecord = JSON.parse(JSON.stringify(record.value))
		return {
			schemaVersion: 1,
			orderedIds: [...orderedIds.value],
			templateSets,
		}
	}

	async function mergeFromAdvzeu(payload: AdvZeUExportPayload) {
		await load()

		const merged = mergeAdvZeUIntoTemplateState(
			{ record: record.value, orderedIds: orderedIds.value },
			payload,
		)

		record.value = merged.record
		orderedIds.value = merged.orderedIds
		isLoaded.value = true

		// Persist both snapshots together so UI ordering and stored sets stay aligned.
		debouncedPersistRecord(record.value)
		debouncedPersistList(orderedIds.value)
	}

	return {
		record,
		orderedIds,
		isLoaded,
		load,
		addSet,
		removeSet,
		getSetData,
		ensureSet,
		saveSetData,
		getSetLabel,
		exportAllAdvzeu,
		mergeFromAdvzeu,
		createEmptySet,
		createDefaultSet,
	}
})

function isUuid(s: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export { createDefaultSet, createEmptySet, type TemplateSetsRecord }
