import { get, set } from 'idb-keyval'

export type IdbLoadResult<T> = {
	value: T | undefined
	error: unknown
}

export async function idbLoad<T>(key: string): Promise<IdbLoadResult<T>> {
	try {
		return { value: await get<T>(key), error: null }
	} catch (err) {
		console.error(`[idb] get failed for key "${key}":`, err)
		return { value: undefined, error: err }
	}
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
	return (await idbLoad<T>(key)).value
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
	try {
		await set(key, JSON.parse(JSON.stringify(value)))
	} catch (err) {
		console.error(`[idb] set failed for key "${key}":`, err)
		throw err
	}
}

/**
 * Creates a debounced persist function that batches rapid writes.
 * Trailing-edge debounce: only the last value wins within the delay window.
 */
export function createDebouncedPersist<T>(key: string, delayMs = 300) {
	let timer: ReturnType<typeof setTimeout> | null = null
	let latestValue: T | undefined

	function persist(value: T) {
		latestValue = value
		if (timer) clearTimeout(timer)
		timer = setTimeout(async () => {
			timer = null
			try {
				await idbSet(key, latestValue)
			} catch (err) {
				console.error(`[idb-debounced] persist failed for key "${key}":`, err)
			}
		}, delayMs)
	}

	function flush() {
		if (timer) {
			clearTimeout(timer)
			timer = null
			if (latestValue !== undefined) {
				idbSet(key, latestValue).catch((err) => {
					console.error(`[idb-debounced] flush failed for key "${key}":`, err)
				})
			}
		}
	}

	return { persist, flush }
}
