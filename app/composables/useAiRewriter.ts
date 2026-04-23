import type { RewriterInstance } from '~/types/rewriter'

export type EnhancePhase = 'idle' | 'checking' | 'downloading' | 'generating' | 'done' | 'error'

const REWRITER_SHARED_CONTEXT =
	'DO NOT ADD NEW SENTENCES, DO NOT REMOVE SENTENCES, ONLY ADJUST FORMULATIONS TO IMPROVE THE READABILITY. YOU MAY COMBINE SENTENCES WHILE KEEPING THE MEANING. OUTPUT IN GERMAN.'

export function useAiRewriter() {
	const enhancePhase = ref<EnhancePhase>('idle')
	const enhanceDownloadProgress = ref(0)
	const enhanceResult = ref('')
	const enhanceError = ref<string | null>(null)
	const isAvailable = ref(false)
	const enhanceAbortController = ref<AbortController | null>(null)
	const enhanceRewriter = ref<RewriterInstance | null>(null)

	onMounted(() => {
		isAvailable.value =
			typeof window !== 'undefined' &&
			'Rewriter' in window &&
			window.isSecureContext
	})

	function reset() {
		enhanceAbortController.value?.abort()
		enhanceRewriter.value?.destroy()
		enhanceRewriter.value = null
		enhanceAbortController.value = null
		enhancePhase.value = 'idle'
		enhanceDownloadProgress.value = 0
		enhanceResult.value = ''
		enhanceError.value = null
	}

	async function enhance(input: string) {
		if (!input.trim()) return

		if (typeof window === 'undefined' || !('Rewriter' in window)) {
			enhanceError.value = 'Rewriter-API in diesem Browser nicht verfügbar (z. B. Chrome mit aktiviertem Flag).'
			enhancePhase.value = 'error'
			return
		}
		if (!window.isSecureContext) {
			enhanceError.value = 'KI-Verbesserung ist nur in sicherem Kontext (HTTPS) verfügbar.'
			enhancePhase.value = 'error'
			return
		}

		const Rewriter = window.Rewriter!
		enhanceAbortController.value = new AbortController()
		enhancePhase.value = 'checking'
		enhanceError.value = null
		enhanceResult.value = ''
		enhanceDownloadProgress.value = 0

		const createOptions = {
			tone: 'as-is' as const,
			format: 'as-is' as const,
			length: 'as-is' as const,
			sharedContext: REWRITER_SHARED_CONTEXT,
			signal: enhanceAbortController.value.signal,
		}

		try {
			const availability = await Rewriter.availability(createOptions)
			if (enhanceAbortController.value.signal.aborted) return
			if (availability === 'unavailable') {
				enhanceError.value = 'KI-Verbesserung ist in diesem Browser nicht verfügbar.'
				enhancePhase.value = 'error'
				return
			}
			if (availability === 'downloadable' || availability === 'downloading') {
				enhancePhase.value = 'downloading'
			}
			const rewriter = await Rewriter.create({
				...createOptions,
				monitor(m) {
					m.addEventListener('downloadprogress', (e: ProgressEvent) => {
						enhanceDownloadProgress.value = e.loaded
					})
				},
			})
			if (enhanceAbortController.value.signal.aborted) {
				rewriter.destroy()
				return
			}
			enhanceRewriter.value = rewriter
			enhancePhase.value = 'generating'
			const result = await rewriter.rewrite(input, {
				signal: enhanceAbortController.value.signal,
			})
			if (enhanceAbortController.value.signal.aborted) return
			enhanceResult.value = result
			enhancePhase.value = 'done'
		} catch (err) {
			if (enhanceAbortController.value.signal.aborted) return
			const e = err as DOMException & { requested?: number; quota?: number }
			if (e.name === 'QuotaExceededError') {
				enhanceError.value = 'Text ist zu lang für die Verbesserung.'
			} else if (e.name === 'NotSupportedError') {
				enhanceError.value = 'Sprache oder Optionen werden nicht unterstützt.'
			} else if (e.name === 'NotAllowedError') {
				enhanceError.value = 'Bitte Aktion mit Klick bestätigen.'
			} else if (e.name === 'AbortError') {
				return
			} else {
				enhanceError.value = e.message || 'Verbesserung fehlgeschlagen.'
			}
			enhancePhase.value = 'error'
			enhanceRewriter.value?.destroy()
			enhanceRewriter.value = null
		}
	}

	return {
		isAvailable,
		enhancePhase,
		enhanceDownloadProgress,
		enhanceResult,
		enhanceError,
		enhance,
		reset,
	}
}
