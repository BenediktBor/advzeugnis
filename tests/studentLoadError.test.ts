import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { get } from 'idb-keyval'
import { useStudentsStore } from '~/stores/students'

vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
}))

describe('student storage loading', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref }).ref = ref
		setActivePinia(createPinia())
		vi.mocked(get).mockReset()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('exposes load failures without treating them as persisted students', async () => {
		const error = new Error('IndexedDB unavailable')
		vi.mocked(get).mockRejectedValue(error)
		const store = useStudentsStore()

		await store.load()

		expect(store.students).toEqual([])
		expect(store.isLoaded).toBe(true)
		expect(store.loadError).toBe(error)
	})
})
