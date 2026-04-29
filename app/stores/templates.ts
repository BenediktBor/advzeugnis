import { defineStore } from 'pinia'
import { produce } from 'immer'
import { idbLoad, createDebouncedPersist } from '~/utils/idbStorage'
import {
	TemplateSetSchema,
	type AzSetExportPayload,
	type AzSubjectExportPayload,
} from '~/schemas/template'
import { randomId } from '~/utils/randomId'
import type { Subject, TemplateSet } from '~/types/template'

const STORAGE_KEY = 'template-sets'
const LIST_STORAGE_KEY = 'template-set-list'
const LAST_SELECTED_CATEGORY_STORAGE_KEY = 'template-set-last-selected-category'
const LAST_CATEGORY_SELECTIONS_STORAGE_KEY = 'template-set-last-category-selections'

type SelectedCategoryRef = {
	subjectId: string
	categoryId: string
}

type PersistedCategorySelection = {
	gradeId: string | null
	variantId: string | null
}

type CategorySelectionMapBySet = Record<string, Record<string, PersistedCategorySelection>>

function createEmptySet(id: string, label = 'Neue Vorlage'): TemplateSet {
	return {
		id,
		label,
		subjects: [],
	}
}

export function createTemplateSet(
	label: string,
	id: string = randomId(),
): TemplateSet {
	return createEmptySet(id, label)
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

export type SubjectImportCollisionStrategy = 'replace' | 'duplicate'

export type SubjectImportResult = {
	action: 'appended' | 'replaced' | 'duplicated'
	subject: Subject
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
	opts: { schemaSafeParse: boolean },
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

export function mergeAzSetIntoTemplateState(
	current: TemplateStoreSnapshot,
	payload: AzSetExportPayload,
): TemplateStoreSnapshot {
	const normalizedIncoming = normalizeTemplateSets(
		payload.templateSets as Record<string, TemplateSet | null | undefined>,
		payload.orderedIds,
		{ schemaSafeParse: false },
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

export const mergeAdvZeUIntoTemplateState = mergeAzSetIntoTemplateState

export function createSingleSetAzsetPayload(
	current: TemplateStoreSnapshot,
	setId: string,
): AzSetExportPayload | null {
	const templateSet = current.record[setId]
	if (!templateSet) return null

	return {
		schemaVersion: 1,
		orderedIds: [setId],
		templateSets: {
			[setId]: JSON.parse(JSON.stringify(templateSet)) as TemplateSet,
		},
	}
}

function cloneSubjectWithFreshIds(subject: Subject): Subject {
	return produce(subject, (draft) => {
		draft.id = randomId()
		for (const category of draft.categories) {
			category.id = randomId()
			for (const grade of category.grades) {
				grade.id = randomId()
				for (const variant of grade.variants) {
					variant.id = randomId()
				}
			}
		}
	})
}

export function mergeSubjectIntoTemplateSet(
	currentSet: TemplateSet,
	incomingSubject: Subject,
	strategy: SubjectImportCollisionStrategy,
): {
	setData: TemplateSet
	result: SubjectImportResult
} {
	const existingIndex = currentSet.subjects.findIndex((subject) => subject.id === incomingSubject.id)

	if (existingIndex === -1) {
		return {
			setData: produce(currentSet, (draft) => {
				draft.subjects.push(incomingSubject)
			}),
			result: { action: 'appended', subject: incomingSubject },
		}
	}

	if (strategy === 'replace') {
		return {
			setData: produce(currentSet, (draft) => {
				draft.subjects[existingIndex] = incomingSubject
			}),
			result: { action: 'replaced', subject: incomingSubject },
		}
	}

	const duplicatedSubject = cloneSubjectWithFreshIds(incomingSubject)
	return {
		setData: produce(currentSet, (draft) => {
			draft.subjects.push(duplicatedSubject)
		}),
		result: { action: 'duplicated', subject: duplicatedSubject },
	}
}

export const useTemplatesStore = defineStore('templates', () => {
	const record = ref<TemplateSetsRecord>({})
	const orderedIds = ref<string[]>([])
	const lastSelectedCategoryBySetId = ref<Record<string, SelectedCategoryRef>>({})
	const lastCategorySelectionsBySetId = ref<CategorySelectionMapBySet>({})
	const isLoaded = ref(false)
	const loadError = ref<unknown>(null)
	const { persist: debouncedPersistRecord } = createDebouncedPersist<TemplateSetsRecord>(STORAGE_KEY)
	const { persist: debouncedPersistList } = createDebouncedPersist<string[]>(LIST_STORAGE_KEY)
	const { persist: debouncedPersistLastSelectedCategory } = createDebouncedPersist<Record<string, SelectedCategoryRef>>(
		LAST_SELECTED_CATEGORY_STORAGE_KEY,
	)
	const { persist: debouncedPersistLastCategorySelections } = createDebouncedPersist<CategorySelectionMapBySet>(
		LAST_CATEGORY_SELECTIONS_STORAGE_KEY,
	)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const [storedResult, storedListResult, storedSelectedCategoryResult, storedCategorySelectionsResult] = await Promise.all([
			idbLoad<Record<string, TemplateSet>>(STORAGE_KEY),
			idbLoad<string[]>(LIST_STORAGE_KEY),
			idbLoad<Record<string, SelectedCategoryRef>>(LAST_SELECTED_CATEGORY_STORAGE_KEY),
			idbLoad<CategorySelectionMapBySet>(LAST_CATEGORY_SELECTIONS_STORAGE_KEY),
		])
		loadError.value = storedResult.error ?? storedListResult.error ?? storedSelectedCategoryResult.error ?? storedCategorySelectionsResult.error

		const normalized = normalizeTemplateSets(
			(storedResult.value ?? {}) as Record<string, TemplateSet | null | undefined>,
			storedListResult.value,
			{ schemaSafeParse: true },
		)

		record.value = normalized.record
		orderedIds.value = normalized.orderedIds
		const rawSelectedCategories = storedSelectedCategoryResult.value ?? {}
		const nextSelectedCategories: Record<string, SelectedCategoryRef> = {}
		for (const [setId, selection] of Object.entries(rawSelectedCategories)) {
			if (!selection || typeof selection !== 'object') continue
			if (typeof selection.subjectId !== 'string' || typeof selection.categoryId !== 'string') continue
			nextSelectedCategories[setId] = {
				subjectId: selection.subjectId,
				categoryId: selection.categoryId,
			}
		}
		lastSelectedCategoryBySetId.value = nextSelectedCategories
		const rawCategorySelections = storedCategorySelectionsResult.value ?? {}
		const nextCategorySelections: CategorySelectionMapBySet = {}
		for (const [setId, byCategory] of Object.entries(rawCategorySelections)) {
			if (!byCategory || typeof byCategory !== 'object') continue
			const nextByCategory: Record<string, PersistedCategorySelection> = {}
			for (const [categoryKey, selection] of Object.entries(byCategory)) {
				if (!selection || typeof selection !== 'object') continue
				const gradeId = typeof selection.gradeId === 'string' ? selection.gradeId : null
				const variantId = typeof selection.variantId === 'string' ? selection.variantId : null
				nextByCategory[categoryKey] = { gradeId, variantId }
			}
			if (Object.keys(nextByCategory).length > 0) {
				nextCategorySelections[setId] = nextByCategory
			}
		}
		lastCategorySelectionsBySetId.value = nextCategorySelections
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

	function persistLastSelectedCategory() {
		debouncedPersistLastSelectedCategory(lastSelectedCategoryBySetId.value)
	}

	function persistLastCategorySelections() {
		debouncedPersistLastCategorySelections(lastCategorySelectionsBySetId.value)
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

	function addSet(label: string): string {
		const trimmed = label.trim()
		if (!trimmed) return ''
		const newSet = createTemplateSet(trimmed)
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

		if (Object.prototype.hasOwnProperty.call(lastSelectedCategoryBySetId.value, setId)) {
			const { [setId]: _, ...restSelections } = lastSelectedCategoryBySetId.value
			lastSelectedCategoryBySetId.value = restSelections
			persistLastSelectedCategory()
		}

		if (Object.prototype.hasOwnProperty.call(lastCategorySelectionsBySetId.value, setId)) {
			const { [setId]: _, ...restCategorySelections } = lastCategorySelectionsBySetId.value
			lastCategorySelectionsBySetId.value = restCategorySelections
			persistLastCategorySelections()
		}
	}

	function getLastSelectedCategory(setId: string): SelectedCategoryRef | null {
		return lastSelectedCategoryBySetId.value[setId] ?? null
	}

	function setLastSelectedCategory(setId: string, category: SelectedCategoryRef | null) {
		if (!setId) return
		if (!category) {
			if (!Object.prototype.hasOwnProperty.call(lastSelectedCategoryBySetId.value, setId)) return
			const { [setId]: _, ...rest } = lastSelectedCategoryBySetId.value
			lastSelectedCategoryBySetId.value = rest
			persistLastSelectedCategory()
			return
		}
		lastSelectedCategoryBySetId.value = {
			...lastSelectedCategoryBySetId.value,
			[setId]: category,
		}
		persistLastSelectedCategory()
	}

	function getLastCategorySelection(setId: string, categoryKey: string): PersistedCategorySelection | null {
		return lastCategorySelectionsBySetId.value[setId]?.[categoryKey] ?? null
	}

	function setLastCategorySelection(
		setId: string,
		categoryKey: string,
		selection: PersistedCategorySelection | null,
	) {
		if (!setId || !categoryKey) return
		const setSelections = lastCategorySelectionsBySetId.value[setId] ?? {}
		if (!selection) {
			if (!Object.prototype.hasOwnProperty.call(setSelections, categoryKey)) return
			const { [categoryKey]: _, ...rest } = setSelections
			const nextBySetId = { ...lastCategorySelectionsBySetId.value }
			if (Object.keys(rest).length === 0) {
				delete nextBySetId[setId]
			} else {
				nextBySetId[setId] = rest
			}
			lastCategorySelectionsBySetId.value = nextBySetId
			persistLastCategorySelections()
			return
		}
		lastCategorySelectionsBySetId.value = {
			...lastCategorySelectionsBySetId.value,
			[setId]: {
				...setSelections,
				[categoryKey]: selection,
			},
		}
		persistLastCategorySelections()
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

	async function exportAllAzset(): Promise<AzSetExportPayload> {
		await load()

		// Export a plain JSON object (avoid Vue/Pinia reactivity).
		const templateSets: TemplateSetsRecord = JSON.parse(JSON.stringify(record.value))
		return {
			schemaVersion: 1,
			orderedIds: [...orderedIds.value],
			templateSets,
		}
	}

	async function exportAzsetForSet(setId: string): Promise<AzSetExportPayload | null> {
		await load()

		return createSingleSetAzsetPayload(
			{ record: record.value, orderedIds: orderedIds.value },
			setId,
		)
	}

	async function mergeFromAzset(payload: AzSetExportPayload) {
		await load()

		const merged = mergeAzSetIntoTemplateState(
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

	async function exportSubject(setId: string, subjectId: string): Promise<AzSubjectExportPayload | null> {
		await load()
		const subject = record.value[setId]?.subjects.find((item) => item.id === subjectId)
		if (!subject) return null

		return {
			schemaVersion: 1,
			subject: JSON.parse(JSON.stringify(subject)) as Subject,
		}
	}

	async function importSubjectIntoSet(
		setId: string,
		payload: AzSubjectExportPayload,
		strategy: SubjectImportCollisionStrategy,
	): Promise<SubjectImportResult | null> {
		await load()
		const currentSet = getSetData(setId)
		if (!currentSet) return null

		const merged = mergeSubjectIntoTemplateSet(currentSet, payload.subject, strategy)
		saveSetData(setId, merged.setData)
		return merged.result
	}

	return {
		record,
		orderedIds,
		isLoaded,
		loadError,
		load,
		getLastSelectedCategory,
		setLastSelectedCategory,
		getLastCategorySelection,
		setLastCategorySelection,
		addSet,
		removeSet,
		getSetData,
		ensureSet,
		saveSetData,
		getSetLabel,
		exportAllAzset,
		exportAzsetForSet,
		mergeFromAzset,
		exportSubject,
		importSubjectIntoSet,
		createEmptySet,
	}
})

function isUuid(s: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export { createEmptySet, type TemplateSetsRecord }
