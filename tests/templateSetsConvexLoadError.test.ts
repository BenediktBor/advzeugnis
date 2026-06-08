import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { get } from 'idb-keyval'

const {
	listSummaryQueryData,
	listSummaryQueryError,
	listSummaryQueryPending,
} = vi.hoisted(() => {
	const { ref } = require('vue') as typeof import('vue')
	return {
		listSummaryQueryData: ref<unknown[] | undefined>(undefined),
		listSummaryQueryError: ref<Error | null>(null),
		listSummaryQueryPending: ref(false),
	}
})

vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('convex-vue', () => ({
	useConvexClient: vi.fn(() => ({})),
	useConvexQuery: vi.fn(() => ({
		data: listSummaryQueryData,
		error: listSummaryQueryError,
		isPending: listSummaryQueryPending,
	})),
}))

import { useTemplateSets } from '~/composables/useTemplates'
import { useCurrentUserStore } from '~/stores/currentUser'
import { useTemplatesStore } from '~/stores/templates'

const REMOTE_SET_ID = '11111111-1111-1111-1111-111111111111'
const SCHOOL_ID = 'school-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa'

function makeRemoteSummary() {
	return {
		id: REMOTE_SET_ID,
		label: 'Klasse 1',
		subjects: [] as string[],
		subjectPreview: [] as string[],
		remainingSubjectCount: 0,
		subjectCount: 0,
		categoryCount: 0,
		gradeCount: 0,
		variantCount: 0,
		sortOrder: 0,
		updatedAt: 0,
		updatedBy: 'user',
	}
}

describe('useTemplateSets convex-aware load errors', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).ref = ref
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).computed = computed
		setActivePinia(createPinia())
		vi.mocked(get).mockReset()
		listSummaryQueryData.value = undefined
		listSummaryQueryError.value = null
		listSummaryQueryPending.value = false
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('separates template IndexedDB failures from successful Convex summaries for school users', async () => {
		const idbError = new Error('IndexedDB unavailable')
		vi.mocked(get).mockRejectedValue(idbError)
		listSummaryQueryData.value = [makeRemoteSummary()]

		const currentUserStore = useCurrentUserStore()
		currentUserStore.setStubUser({
			type: 'school',
			role: 'admin',
			schoolId: SCHOOL_ID,
			schoolName: 'Testschule',
		})

		const templatesStore = useTemplatesStore()
		await templatesStore.load()
		expect(templatesStore.loadError).toBe(idbError)

		const {
			storageLoadError,
			remoteLoadError,
			loadError,
			hasAnyTemplateSets,
		} = useTemplateSets()
		await nextTick()

		expect(storageLoadError.value).toBeNull()
		expect(remoteLoadError.value).toBeNull()
		expect(loadError.value).toBeNull()
		expect(hasAnyTemplateSets.value).toBe(true)
	})

	it('keeps template IndexedDB failures as storage errors for solo users', async () => {
		const idbError = new Error('IndexedDB unavailable')
		vi.mocked(get).mockRejectedValue(idbError)
		listSummaryQueryData.value = []

		const currentUserStore = useCurrentUserStore()
		currentUserStore.setStubUser({ type: 'solo', schoolId: undefined })

		const templatesStore = useTemplatesStore()
		await templatesStore.load()
		expect(templatesStore.loadError).toBe(idbError)

		const { storageLoadError, remoteLoadError, loadError } = useTemplateSets()
		await nextTick()

		expect(storageLoadError.value).toBe(idbError)
		expect(remoteLoadError.value).toBeNull()
		expect(loadError.value).toBe(idbError)
	})

	it('keeps loading state ahead of template IndexedDB failures while Convex listSummary is pending', async () => {
		const idbError = new Error('IndexedDB unavailable')
		vi.mocked(get).mockRejectedValue(idbError)
		listSummaryQueryPending.value = true

		const currentUserStore = useCurrentUserStore()
		currentUserStore.setStubUser({
			type: 'school',
			role: 'admin',
			schoolId: SCHOOL_ID,
			schoolName: 'Testschule',
		})

		const templatesStore = useTemplatesStore()
		await templatesStore.load()

		const { loadError, isLoaded, storageLoadError } = useTemplateSets()
		await nextTick()

		expect(isLoaded.value).toBe(false)
		expect(storageLoadError.value).toBe(idbError)
		expect(loadError.value).toBe(idbError)
	})

	it('treats auth startup errors from early template subscriptions as non-blocking', async () => {
		vi.mocked(get).mockResolvedValue(undefined)
		listSummaryQueryError.value = new Error('Not authenticated')

		const templatesStore = useTemplatesStore()
		await templatesStore.load()

		const { storageLoadError, remoteLoadError, loadError } = useTemplateSets()
		await nextTick()

		expect(storageLoadError.value).toBeNull()
		expect(remoteLoadError.value).toBeNull()
		expect(loadError.value).toBeNull()
	})

	it('exposes real Convex errors as remote template errors', async () => {
		const remoteError = new Error('Convex unavailable')
		vi.mocked(get).mockResolvedValue(undefined)
		listSummaryQueryError.value = remoteError

		const templatesStore = useTemplatesStore()
		await templatesStore.load()

		const { storageLoadError, remoteLoadError, loadError } = useTemplateSets()
		await nextTick()

		expect(storageLoadError.value).toBeNull()
		expect(remoteLoadError.value).toBe(remoteError)
		expect(loadError.value).toBe(remoteError)
	})
})
