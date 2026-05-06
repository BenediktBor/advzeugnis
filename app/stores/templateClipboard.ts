import { defineStore } from 'pinia'
import { TemplateClipboardPayloadSchema } from '~/schemas/template'
import { idbLoad, idbSet } from '~/utils/idbStorage'
import type { TemplateClipboardPayload } from '~/types/template'

const STORAGE_KEY = 'template-editor-clipboard'

export const useTemplateClipboardStore = defineStore('templateClipboard', () => {
	const payload = ref<TemplateClipboardPayload | null>(null)
	const isLoaded = ref(false)
	const loadError = ref<unknown>(null)
	let loadPromise: Promise<void> | null = null

	function load() {
		if (loadPromise) return loadPromise
		loadPromise = doLoad()
		return loadPromise
	}

	async function doLoad() {
		const stored = await idbLoad<unknown>(STORAGE_KEY)
		loadError.value = stored.error
		const parsed = TemplateClipboardPayloadSchema.safeParse(stored.value)
		payload.value = parsed.success ? (parsed.data as TemplateClipboardPayload) : null
		isLoaded.value = true
	}

	async function setPayload(nextPayload: TemplateClipboardPayload | null) {
		payload.value = nextPayload
		await idbSet(STORAGE_KEY, nextPayload)
	}

	return {
		payload,
		isLoaded,
		loadError,
		load,
		setPayload,
	}
})
