import { produce } from 'immer'
import { useConvexClient, useConvexQuery } from 'convex-vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { reactive, ref, toRaw, toValue, watch, watchEffect } from 'vue'
import { TemplateSetSchema } from '~/schemas/template'
import { useTemplatesStore } from '~/stores/templates'
import { useCurrentUserStore } from '~/stores/currentUser'
import { api } from '~/utils/convexApi'
import { randomId } from '~/utils/randomId'
import { summarizeVisibleTemplateSet } from '~/utils/templateVisibility'
import type {
	Category,
	Grade,
	OptionalGroupChildPart,
	SentencePart,
	SentencePartPath,
	Subject,
	TemplateSet,
	Variant,
} from '~/types/template'

export type SetWithData = {
	id: string
	label: string
	hidden?: boolean
	subjects: string[]
	subjectPreview: string[]
	remainingSubjectCount: number
	subjectCount: number
	categoryCount: number
	gradeCount: number
	variantCount: number
}

type RemoteTemplateSummary = SetWithData & {
	sortOrder: number
	updatedAt: number
	updatedBy: string
}

type TemplateSyncUpsertOperation = {
	kind: 'upsert'
	templateId: string
	label: string
	data: TemplateSet
	sortOrder: number
}

type TemplateSyncRemoveOperation = {
	kind: 'remove'
	templateId: string
}

type TemplateSyncOperation = TemplateSyncUpsertOperation | TemplateSyncRemoveOperation

type TemplateSyncQueue = {
	timer: ReturnType<typeof setTimeout> | null
	inFlight: Promise<void> | null
	latest: TemplateSyncOperation | null
	failed: TemplateSyncOperation | null
}

const TEMPLATE_SYNC_DEBOUNCE_MS = 800
const LOCAL_TEMPLATE_MIGRATION_STATUS_ID = '__local_template_migration__'
const templateSyncQueues = new Map<string, TemplateSyncQueue>()
const templateSyncStatus = reactive<Record<string, { isPending: boolean, error: string | null }>>({})
const localTemplateMigrationBySchoolId = new Map<string, Promise<void> | 'done'>()

function getTemplateSyncQueue(templateId: string) {
	let queue = templateSyncQueues.get(templateId)
	if (!queue) {
		queue = { timer: null, inFlight: null, latest: null, failed: null }
		templateSyncQueues.set(templateId, queue)
	}
	return queue
}

function setTemplateSyncStatus(templateId: string, status: { isPending?: boolean, error?: string | null }) {
	const current = templateSyncStatus[templateId] ?? { isPending: false, error: null }
	templateSyncStatus[templateId] = {
		isPending: status.isPending ?? current.isPending,
		error: status.error === undefined ? current.error : status.error,
	}
}

function getErrorMessage(err: unknown) {
	return err instanceof Error ? err.message : String(err)
}

function hasTemplateSyncWork() {
	for (const queue of templateSyncQueues.values()) {
		if (queue.timer || queue.inFlight || queue.latest || queue.failed) return true
	}
	return Object.values(templateSyncStatus).some((status) => status.isPending || status.error)
}

async function runTemplateSyncOperation(client: ReturnType<typeof useConvexClient>, operation: TemplateSyncOperation) {
	if (operation.kind === 'remove') {
		await client.mutation(api.templates.remove, { templateId: operation.templateId })
		return
	}
	await client.mutation(api.templates.upsert, {
		templateId: operation.templateId,
		label: operation.label,
		data: JSON.parse(JSON.stringify(operation.data)),
		sortOrder: operation.sortOrder,
	})
}

function flushTemplateSync(client: ReturnType<typeof useConvexClient>, templateId: string) {
	const queue = getTemplateSyncQueue(templateId)
	if (queue.inFlight) return
	const operation = queue.latest
	if (!operation) {
		setTemplateSyncStatus(templateId, { isPending: false })
		return
	}

	queue.latest = null
	queue.failed = null
	queue.inFlight = runTemplateSyncOperation(client, operation)
		.then(() => {
			if (!queue.latest) setTemplateSyncStatus(templateId, { isPending: false, error: null })
		})
		.catch((err) => {
			console.error('[templates] Convex sync failed:', err)
			queue.failed = operation
			setTemplateSyncStatus(templateId, { isPending: false, error: getErrorMessage(err) })
		})
		.finally(() => {
			queue.inFlight = null
			if (queue.latest) flushTemplateSync(client, templateId)
		})
}

function enqueueTemplateSync(client: ReturnType<typeof useConvexClient> | null, operation: TemplateSyncOperation) {
	if (!client) {
		setTemplateSyncStatus(operation.templateId, {
			isPending: false,
			error: 'Convex-Verbindung ist nicht verfügbar.',
		})
		return
	}
	const queue = getTemplateSyncQueue(operation.templateId)
	if (queue.timer) clearTimeout(queue.timer)
	queue.latest = operation
	queue.failed = null
	setTemplateSyncStatus(operation.templateId, { isPending: true, error: null })
	queue.timer = setTimeout(() => {
		queue.timer = null
		flushTemplateSync(client, operation.templateId)
	}, TEMPLATE_SYNC_DEBOUNCE_MS)
}

function retryTemplateSync(client: ReturnType<typeof useConvexClient> | null, templateId: string) {
	if (!client) {
		setTemplateSyncStatus(templateId, {
			isPending: false,
			error: 'Convex-Verbindung ist nicht verfügbar.',
		})
		return
	}
	const queue = getTemplateSyncQueue(templateId)
	const operation = queue.latest ?? queue.failed
	if (!operation) return
	queue.latest = operation
	queue.failed = null
	if (queue.timer) clearTimeout(queue.timer)
	queue.timer = null
	setTemplateSyncStatus(templateId, { isPending: true, error: null })
	flushTemplateSync(client, templateId)
}

async function migrateLocalTemplatesToConvex(
	client: ReturnType<typeof useConvexClient>,
	store: ReturnType<typeof useTemplatesStore>,
	schoolId: string,
) {
	if (localTemplateMigrationBySchoolId.has(schoolId)) return

	const migration = (async () => {
		setTemplateSyncStatus(LOCAL_TEMPLATE_MIGRATION_STATUS_ID, { isPending: true, error: null })
		const snapshot = await store.exportAllAzset()
		if (snapshot.orderedIds.length === 0) return

		await client.mutation(api.templates.upsertMany, {
			sets: snapshot.orderedIds.map((templateId, index) => ({
				templateId,
				label: snapshot.templateSets[templateId]?.label ?? '',
				data: snapshot.templateSets[templateId],
				sortOrder: index,
			})),
		})
	})()
		.then(() => {
			localTemplateMigrationBySchoolId.set(schoolId, 'done')
			setTemplateSyncStatus(LOCAL_TEMPLATE_MIGRATION_STATUS_ID, { isPending: false, error: null })
		})
		.catch((err) => {
			console.error('[templates] local template migration failed:', err)
			localTemplateMigrationBySchoolId.delete(schoolId)
			setTemplateSyncStatus(LOCAL_TEMPLATE_MIGRATION_STATUS_ID, { isPending: false, error: getErrorMessage(err) })
		})

	localTemplateMigrationBySchoolId.set(schoolId, migration)
}

function repairLegacyRemoteTemplates(client: ReturnType<typeof useConvexClient> | null, schoolId: string | undefined) {
	if (!client || !schoolId) return
	const statusKey = `__remote_template_repair_${schoolId}`
	if (templateSyncStatus[statusKey]?.isPending) return

	setTemplateSyncStatus(statusKey, { isPending: true, error: null })
	client.mutation(api.templates.repairLegacyData, {})
		.then(() => setTemplateSyncStatus(statusKey, { isPending: false, error: null }))
		.catch((err) => {
			console.error('[templates] remote template repair failed:', err)
			setTemplateSyncStatus(statusKey, { isPending: false, error: getErrorMessage(err) })
		})
}

async function loadRemoteTemplateSet(
	client: ReturnType<typeof useConvexClient> | null,
	store: ReturnType<typeof useTemplatesStore>,
	templateId: string,
	schoolId?: string,
) {
	if (!templateId) return null
	const cached = store.getSetData(templateId)
	if (cached) return cached
	if (!client) {
		setTemplateSyncStatus(templateId, {
			isPending: false,
			error: 'Convex-Verbindung ist nicht verfügbar.',
		})
		return null
	}

	try {
		const row = await client.query(api.templates.get, { templateId }) as { id: string, label: string, data: unknown } | null
		if (!row) return null
		const parsed = TemplateSetSchema.safeParse(row.data)
		if (!parsed.success) {
			console.warn(`[templates] Dropping invalid Convex template set "${row.id}":`, parsed.error.issues)
			repairLegacyRemoteTemplates(client, schoolId)
			return null
		}
		const data = parsed.data as TemplateSet
		store.saveSetData(row.id, data)
		return data
	} catch (err) {
		console.error('[templates] template load failed:', err)
		setTemplateSyncStatus(templateId, { isPending: false, error: getErrorMessage(err) })
		return null
	}
}

function toError(value: unknown) {
	return value instanceof Error ? value : new Error(String(value))
}

function isAuthStartupError(error: Error | null | undefined) {
	if (!error) return false
	return /not authenticated|unauthenticated/i.test(error.message)
}

function useOptionalConvexClient(onError?: (err: Error) => void) {
	try {
		return useConvexClient()
	} catch (err) {
		onError?.(toError(err))
		return null
	}
}

function useOptionalConvexQuery<T>(
	createQuery: () => { data: Ref<T | undefined>, error: Ref<Error | null>, isPending: Ref<boolean> },
	onError?: (err: Error) => void,
) {
	try {
		return createQuery()
	} catch (err) {
		onError?.(toError(err))
		return {
			data: ref<T | undefined>(undefined),
			error: ref<Error | null>(null),
			isPending: ref(false),
		}
	}
}

export function useTemplateSets() {
	const store = useTemplatesStore()
	store.load()
	const remoteSummaries = ref<RemoteTemplateSummary[] | null>(null)
	const convexSetupError = ref<Error | null>(null)
	const client = useOptionalConvexClient((err) => {
		convexSetupError.value = err
	})
	const currentUserStore = useCurrentUserStore()
	currentUserStore.load()
	const templateSetsQuery = useOptionalConvexQuery(
		() => useConvexQuery(api.templates.listSummary, {}, { server: false }),
		(err) => {
			convexSetupError.value = err
		},
	)

	function isConvexListReady() {
		return !templateSetsQuery.isPending.value && templateSetsQuery.data.value !== undefined
	}

	watchEffect(() => {
		const remoteSets = templateSetsQuery.data.value
		if (!remoteSets) return
		if (!store.isLoaded) return
		if (hasTemplateSyncWork()) return

		const schoolId = currentUserStore.currentUser.schoolId
		if (!schoolId) {
			if (store.orderedIds.length > 0 && remoteSets.length === 0) return
		} else if (remoteSets.length === 0 && store.orderedIds.length > 0 && client) {
			void migrateLocalTemplatesToConvex(client, store, schoolId)
			return
		}

		remoteSummaries.value = remoteSets as RemoteTemplateSummary[]
	})

	const orderedIds = computed(() => remoteSummaries.value?.map((row) => row.id) ?? store.orderedIds)
	const canSeeHiddenTemplates = computed(() => currentUserStore.canEditTemplates)

	const setsWithData = computed<SetWithData[]>(() =>
		remoteSummaries.value?.map((row) => ({
			id: row.id,
			label: row.label,
			hidden: row.hidden,
			subjects: row.subjects,
			subjectPreview: row.subjectPreview,
			remainingSubjectCount: row.remainingSubjectCount,
			subjectCount: row.subjectCount,
			categoryCount: row.categoryCount,
			gradeCount: row.gradeCount,
			variantCount: row.variantCount,
		})) ??
		store.orderedIds.map((setId) => {
			const setData = store.getSetData(setId)
			if (!setData) {
				return {
					id: setId,
					label: '',
					subjects: [],
					subjectPreview: [],
					remainingSubjectCount: 0,
					subjectCount: 0,
					categoryCount: 0,
					gradeCount: 0,
					variantCount: 0,
				}
			}
			const summary = summarizeVisibleTemplateSet(setData, canSeeHiddenTemplates.value)

			return {
				id: setId,
				label: setData.label,
				hidden: setData.hidden,
				...summary,
			}
		})
	)

	const sortedSetsWithData = computed<SetWithData[]>(() =>
		[...setsWithData.value].sort((a, b) =>
			a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }),
		),
	)

	const visibleSortedSetsWithData = computed<SetWithData[]>(() => {
		const sets = canSeeHiddenTemplates.value
			? sortedSetsWithData.value
			: sortedSetsWithData.value.filter((setItem) => !setItem.hidden)
		return sets
	})

	const defaultAlphabeticalTemplateSetId = computed(
		() => visibleSortedSetsWithData.value[0]?.id ?? '',
	)

	const hasAnyTemplateSets = computed(() => {
		if (canSeeHiddenTemplates.value) return orderedIds.value.length > 0
		return visibleSortedSetsWithData.value.length > 0
	})
	const remoteLoadError = computed(() => {
		const queryError = templateSetsQuery.error.value
		if (queryError && !isAuthStartupError(queryError)) return queryError
		return convexSetupError.value
	})
	const storageLoadError = computed(() => {
		if (!store.loadError) return null
		// For school accounts, Convex is authoritative once listSummary responds.
		if (currentUserStore.currentUser.schoolId && isConvexListReady()) return null
		return store.loadError
	})

	function getSetLabel(setId: string): string {
		return remoteSummaries.value?.find((row) => row.id === setId)?.label ?? store.getSetLabel(setId)
	}

	function getSetData(setId: string): TemplateSet | null {
		return store.getSetData(setId)
	}

	function syncSet(setId: string) {
		const setData = store.getSetData(setId)
		if (!setData) return
		enqueueTemplateSync(client, {
			kind: 'upsert',
			templateId: setId,
			label: setData.label,
			data: setData,
			sortOrder: store.orderedIds.indexOf(setId),
		})
	}

	function addSet(label: string): string {
		const setId = store.addSet(label)
		if (setId) syncSet(setId)
		return setId
	}

	function removeSet(setId: string) {
		store.removeSet(setId)
		enqueueTemplateSync(client, { kind: 'remove', templateId: setId })
	}

	async function loadSetData(setId: string) {
		return await loadRemoteTemplateSet(client, store, setId, currentUserStore.currentUser.schoolId)
	}

	async function toggleSetHidden(setId: string) {
		const data = getSetData(setId) ?? await loadSetData(setId)
		if (!data) return
		const updated = produce(data, (draft) => {
			draft.hidden = !draft.hidden
		})
		store.saveSetData(setId, updated)
		syncSet(setId)
	}

	return {
		orderedIds,
		setsWithData,
		sortedSetsWithData,
		visibleSortedSetsWithData,
		defaultAlphabeticalTemplateSetId,
		hasAnyTemplateSets,
		isLoaded: computed(() =>
			store.isLoaded &&
			!templateSetsQuery.isPending.value,
		),
		storageLoadError,
		remoteLoadError,
		loadError: computed(() => storageLoadError.value ?? remoteLoadError.value),
		syncStatus: computed(() => templateSyncStatus),
		hasPendingSync: computed(() => Object.values(templateSyncStatus).some((status) => status.isPending)),
		syncError: computed(() => Object.values(templateSyncStatus).find((status) => status.error)?.error ?? null),
		retrySync: (setId: string) => retryTemplateSync(client, setId),
		loadSetData,
		addSet,
		removeSet,
		toggleSetHidden,
		getSetLabel,
		getSetData,
	}
}

export function useTemplates(setIdRef: MaybeRefOrGetter<string>) {
	const store = useTemplatesStore()
	store.load()
	const convexSetupError = ref<Error | null>(null)
	const client = useOptionalConvexClient((err) => {
		convexSetupError.value = err
	})
	const currentUserStore = useCurrentUserStore()
	currentUserStore.load()

	const setId = computed(() => toValue(setIdRef))

	const setRef = computed<TemplateSet | null>(() => store.getSetData(setId.value))

	watch(
		setId,
		(nextSetId) => {
			if (!nextSetId) return
			void loadRemoteTemplateSet(client, store, nextSetId, currentUserStore.currentUser.schoolId)
		},
		{ immediate: true },
	)

	function getSet(): TemplateSet | null {
		return setRef.value
	}

	function ensureSet(): TemplateSet | null {
		if (!setId.value) return null
		return setRef.value ?? store.ensureSet(setId.value)
	}

	function save(setData: TemplateSet) {
		if (!setId.value) return
		store.saveSetData(setId.value, setData)
		enqueueTemplateSync(client, {
			kind: 'upsert',
			templateId: setId.value,
			label: setData.label,
			data: setData,
			sortOrder: store.orderedIds.indexOf(setId.value),
		})
	}

	function updateSet(recipe: (draft: TemplateSet) => void) {
		const currentSet = ensureSet()
		if (!currentSet) return
		save(produce(toRaw(currentSet), recipe))
	}

	// --- Subjects ---

	function addSubject(label?: string): string {
		const id = randomId()
		updateSet((draft) => {
			draft.subjects.push({ id, label: label?.trim() || 'Neues Fach', categories: [] })
		})
		return id
	}

	function deleteSubject(subjectId: string) {
		updateSet((draft) => {
			draft.subjects = draft.subjects.filter((s) => s.id !== subjectId)
		})
	}

	function insertSubjects(subjects: Subject[], atIndex?: number) {
		if (!subjects.length) return
		updateSet((draft) => {
			const index = atIndex === undefined
				? draft.subjects.length
				: Math.max(0, Math.min(atIndex, draft.subjects.length))
			draft.subjects.splice(index, 0, ...subjects)
		})
	}

	function deleteSubjects(subjectIds: string[]) {
		if (!subjectIds.length) return
		const ids = new Set(subjectIds)
		updateSet((draft) => {
			draft.subjects = draft.subjects.filter((subject) => !ids.has(subject.id))
		})
	}

	function updateSubjectLabel(subjectId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (s) s.label = label
		})
	}

	function reorderSubject(oldIndex: number, newIndex: number) {
		if (oldIndex === newIndex) return
		updateSet((draft) => {
			const removed = draft.subjects.splice(oldIndex, 1)[0]
			if (removed) draft.subjects.splice(newIndex, 0, removed)
		})
	}

	function toggleSubjectHidden(subjectId: string) {
		updateSet((draft) => {
			const subject = draft.subjects.find((s) => s.id === subjectId)
			if (subject) subject.hidden = !subject.hidden
		})
	}

	// --- Categories ---

	function addCategory(subjectId: string, label?: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (!s) return
			s.categories.push({ id, label: label?.trim() || 'Neue Kategorie', grades: [] })
		})
		return id
	}

	function deleteCategory(subjectId: string, categoryId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (!s) return
			s.categories = s.categories.filter((c) => c.id !== categoryId)
		})
	}

	function insertCategories(subjectId: string, categories: Category[], atIndex?: number) {
		if (!categories.length) return
		updateSet((draft) => {
			const subject = draft.subjects.find((s) => s.id === subjectId)
			if (!subject) return
			const index = atIndex === undefined
				? subject.categories.length
				: Math.max(0, Math.min(atIndex, subject.categories.length))
			subject.categories.splice(index, 0, ...categories)
		})
	}

	function deleteCategories(subjectId: string, categoryIds: string[]) {
		if (!categoryIds.length) return
		const ids = new Set(categoryIds)
		updateSet((draft) => {
			const subject = draft.subjects.find((s) => s.id === subjectId)
			if (!subject) return
			subject.categories = subject.categories.filter((category) => !ids.has(category.id))
		})
	}

	function updateCategoryLabel(subjectId: string, categoryId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (c) c.label = label
		})
	}

	function reorderCategory(fromSubjectId: string, oldIndex: number, newIndex: number, toSubjectId: string = fromSubjectId) {
		if (fromSubjectId === toSubjectId && oldIndex === newIndex) return
		updateSet((draft) => {
			const fromSubject = draft.subjects.find((s) => s.id === fromSubjectId)
			if (!fromSubject) return
			const removed = fromSubject.categories.splice(oldIndex, 1)[0]
			if (!removed) return
			if (fromSubjectId === toSubjectId) {
				fromSubject.categories.splice(newIndex, 0, removed)
			} else {
				const toSubject = draft.subjects.find((s) => s.id === toSubjectId)
				if (!toSubject) {
					fromSubject.categories.splice(oldIndex, 0, removed)
					return
				}
				const clampedIndex = Math.max(0, Math.min(newIndex, toSubject.categories.length))
				toSubject.categories.splice(clampedIndex, 0, removed)
			}
		})
	}

	// --- Grades ---

	function addGrade(subjectId: string, categoryId: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (!c) return
			c.grades.push({
				id,
				label: String(c.grades.length + 1),
				variants: [{ id: randomId(), label: '1', sentences: [] }],
			})
		})
		return id
	}

	function deleteGrade(subjectId: string, categoryId: string, gradeId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (!c) return
			c.grades = c.grades.filter((g) => g.id !== gradeId)
		})
	}

	function updateGradeLabel(subjectId: string, categoryId: string, gradeId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (g) g.label = label
		})
	}

	function updateGradeValue(subjectId: string, categoryId: string, gradeId: string, value: number | null) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			if (value === null) {
				delete g.value
			} else {
				g.value = value
			}
		})
	}

	function reorderGrades(subjectId: string, categoryId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			const removed = c.grades.splice(fromIndex, 1)[0]
			if (removed) c.grades.splice(toIndex, 0, removed)
		})
	}

	function insertGrades(subjectId: string, categoryId: string, grades: Grade[], atIndex?: number) {
		if (!grades.length) return
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			const index = atIndex === undefined
				? c.grades.length
				: Math.max(0, Math.min(atIndex, c.grades.length))
			c.grades.splice(index, 0, ...grades)
		})
	}

	function deleteGrades(subjectId: string, categoryId: string, gradeIds: string[]) {
		if (!gradeIds.length) return
		const ids = new Set(gradeIds)
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			c.grades = c.grades.filter((grade) => !ids.has(grade.id))
		})
	}

	// --- Variants ---

	function addVariant(subjectId: string, categoryId: string, gradeId: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			g.variants.push({ id, label: String(g.variants.length + 1), sentences: [] })
		})
		return id
	}

	function deleteVariant(subjectId: string, categoryId: string, gradeId: string, variantId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			g.variants = g.variants.filter((v) => v.id !== variantId)
		})
	}

	function updateVariantLabel(subjectId: string, categoryId: string, gradeId: string, variantId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			const v = g?.variants.find((v) => v.id === variantId)
			if (v) v.label = label
		})
	}

	function reorderVariants(subjectId: string, categoryId: string, gradeId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			const removed = g.variants.splice(fromIndex, 1)[0]
			if (removed) g.variants.splice(toIndex, 0, removed)
		})
	}

	function insertVariants(subjectId: string, categoryId: string, gradeId: string, variants: Variant[], atIndex?: number) {
		if (!variants.length) return
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			const index = atIndex === undefined
				? g.variants.length
				: Math.max(0, Math.min(atIndex, g.variants.length))
			g.variants.splice(index, 0, ...variants)
		})
	}

	function deleteVariants(subjectId: string, categoryId: string, gradeId: string, variantIds: string[]) {
		if (!variantIds.length) return
		const ids = new Set(variantIds)
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			g.variants = g.variants.filter((variant) => !ids.has(variant.id))
		})
	}

	// --- Sentence Parts ---

	function findVariant(draft: TemplateSet, sId: string, cId: string, gId: string, vId: string): Variant | undefined {
		return draft.subjects.find((s) => s.id === sId)
			?.categories.find((c) => c.id === cId)
			?.grades.find((g) => g.id === gId)
			?.variants.find((v) => v.id === vId)
	}

	function addSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, part: SentencePart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v) v.sentences.push(part)
		})
	}

	function findOptionalGroup(variant: Variant, groupIndex: number) {
		const group = variant.sentences[groupIndex]
		return group?.type === 'optionalGroup' ? group : null
	}

	function addOptionalGroupPart(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, part: OptionalGroupChildPart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			group?.parts.push(part)
		})
	}

	function insertOptionalGroupParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, parts: OptionalGroupChildPart[], atIndex?: number) {
		if (!parts.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			if (!group) return
			const index = atIndex === undefined
				? group.parts.length
				: Math.max(0, Math.min(atIndex, group.parts.length))
			group.parts.splice(index, 0, ...parts)
		})
	}

	function updateSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndex: number, part: SentencePart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v && partIndex >= 0 && partIndex < v.sentences.length) {
				v.sentences[partIndex] = part
			}
		})
	}

	function updateSentencePartAtPath(subjectId: string, categoryId: string, gradeId: string, variantId: string, path: SentencePartPath, part: SentencePart | OptionalGroupChildPart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			if (path.childIndex === undefined) {
				if (path.partIndex >= 0 && path.partIndex < v.sentences.length) {
					v.sentences[path.partIndex] = part as SentencePart
				}
				return
			}
			if (part.type === 'optionalGroup') return
			const group = findOptionalGroup(v, path.partIndex)
			if (group && path.childIndex >= 0 && path.childIndex < group.parts.length) {
				group.parts[path.childIndex] = part
			}
		})
	}

	function deleteSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v) v.sentences.splice(partIndex, 1)
		})
	}

	function deleteSentencePartAtPath(subjectId: string, categoryId: string, gradeId: string, variantId: string, path: SentencePartPath) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			if (path.childIndex === undefined) {
				v.sentences.splice(path.partIndex, 1)
				return
			}
			const group = findOptionalGroup(v, path.partIndex)
			if (group) group.parts.splice(path.childIndex, 1)
		})
	}

	function reorderSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const removed = v.sentences.splice(fromIndex, 1)[0]
			if (removed) v.sentences.splice(toIndex, 0, removed)
		})
	}

	function reorderOptionalGroupParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			if (!group) return
			const removed = group.parts.splice(fromIndex, 1)[0]
			if (removed) group.parts.splice(toIndex, 0, removed)
		})
	}

	function moveSentencePartToOptionalGroup(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromIndex: number, groupIndex: number, childIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v || fromIndex === groupIndex) return
			const part = v.sentences[fromIndex]
			if (!part || part.type === 'optionalGroup') return
			const group = findOptionalGroup(v, groupIndex)
			if (!group) return
			const [removed] = v.sentences.splice(fromIndex, 1)
			if (!removed || removed.type === 'optionalGroup') return
			const index = childIndex === undefined
				? group.parts.length
				: Math.max(0, Math.min(childIndex, group.parts.length))
			group.parts.splice(index, 0, removed)
		})
	}

	function moveOptionalGroupPartToRoot(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, childIndex: number, toIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const group = findOptionalGroup(v, groupIndex)
			if (!group) return
			const [removed] = group.parts.splice(childIndex, 1)
			if (!removed) return
			const index = toIndex === undefined
				? v.sentences.length
				: Math.max(0, Math.min(toIndex, v.sentences.length))
			v.sentences.splice(index, 0, removed)
		})
	}

	function moveOptionalGroupPartToOptionalGroup(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromGroupIndex: number, childIndex: number, toGroupIndex: number, toChildIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const fromGroup = findOptionalGroup(v, fromGroupIndex)
			const toGroup = findOptionalGroup(v, toGroupIndex)
			if (!fromGroup || !toGroup) return
			const [removed] = fromGroup.parts.splice(childIndex, 1)
			if (!removed) return
			const insertionLimit = fromGroup === toGroup ? fromGroup.parts.length : toGroup.parts.length
			const index = toChildIndex === undefined
				? insertionLimit
				: Math.max(0, Math.min(toChildIndex, insertionLimit))
			toGroup.parts.splice(index, 0, removed)
		})
	}

	function insertSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, parts: SentencePart[], atIndex?: number) {
		if (!parts.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const index = atIndex === undefined
				? v.sentences.length
				: Math.max(0, Math.min(atIndex, v.sentences.length))
			v.sentences.splice(index, 0, ...parts)
		})
	}

	function deleteSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndexes: number[]) {
		if (!partIndexes.length) return
		const sortedIndexes = [...new Set(partIndexes)]
			.filter((index) => Number.isInteger(index) && index >= 0)
			.sort((a, b) => b - a)
		if (!sortedIndexes.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			for (const index of sortedIndexes) {
				if (index < v.sentences.length) v.sentences.splice(index, 1)
			}
		})
	}

	return {
		setRef,
		getSet,
		isLoaded: computed(() => store.isLoaded),
		loadError: computed(() => store.loadError),
		isSyncPending: computed(() => templateSyncStatus[setId.value]?.isPending ?? false),
		syncError: computed(() => templateSyncStatus[setId.value]?.error ?? convexSetupError.value?.message ?? null),
		retrySync: () => retryTemplateSync(client, setId.value),
		save,
		addSubject,
		deleteSubject,
		insertSubjects,
		deleteSubjects,
		updateSubjectLabel,
		reorderSubject,
		toggleSubjectHidden,
		addCategory,
		deleteCategory,
		insertCategories,
		deleteCategories,
		updateCategoryLabel,
		reorderCategory,
		addGrade,
		deleteGrade,
		updateGradeLabel,
		updateGradeValue,
		reorderGrades,
		insertGrades,
		deleteGrades,
		addVariant,
		deleteVariant,
		updateVariantLabel,
		reorderVariants,
		insertVariants,
		deleteVariants,
		addSentencePart,
		addOptionalGroupPart,
		insertOptionalGroupParts,
		updateSentencePart,
		updateSentencePartAtPath,
		deleteSentencePart,
		deleteSentencePartAtPath,
		reorderSentenceParts,
		reorderOptionalGroupParts,
		moveSentencePartToOptionalGroup,
		moveOptionalGroupPartToRoot,
		moveOptionalGroupPartToOptionalGroup,
		insertSentenceParts,
		deleteSentenceParts,
	}
}
