import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { AzSubjectExportPayloadSchema, type AzSubjectExportPayload } from '~/schemas/template'
import type { SubjectImportCollisionStrategy } from '~/stores/templates'
import { useTemplatesStore } from '~/stores/templates'

function sanitizeFilenamePart(label: string): string {
	const normalized = label
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()

	return normalized || 'fach'
}

export function useTemplateSubjectImportExport(setIdRef: MaybeRefOrGetter<string>) {
	const templatesStore = useTemplatesStore()
	templatesStore.load()

	const toast = useToast()
	const setId = computed(() => toValue(setIdRef))
	const importFileInput = ref<HTMLInputElement | null>(null)
	const pendingImportPayload = ref<AzSubjectExportPayload | null>(null)
	const collisionModalOpen = ref(false)

	const importedSubjectLabel = computed(() => pendingImportPayload.value?.subject.label || 'Unbenannt')
	const hasCollision = computed(() => {
		const subjectId = pendingImportPayload.value?.subject.id
		if (!subjectId) return false
		return !!templatesStore.getSetData(setId.value)?.subjects.some((subject) => subject.id === subjectId)
	})

	function resetPendingImport() {
		pendingImportPayload.value = null
		collisionModalOpen.value = false
	}

	async function finalizeSubjectImport(strategy: SubjectImportCollisionStrategy) {
		if (!pendingImportPayload.value || !setId.value) return

		try {
			const result = await templatesStore.importSubjectIntoSet(
				setId.value,
				pendingImportPayload.value,
				strategy,
			)
			if (!result) {
				toast.add({ title: 'Fach importieren fehlgeschlagen', color: 'error' })
				return
			}

			const toastTitleByAction = {
				appended: 'Fach importiert',
				replaced: 'Fach ersetzt',
				duplicated: 'Fach dupliziert importiert',
			} as const
			toast.add({ title: toastTitleByAction[result.action] })
			resetPendingImport()
		} catch (err) {
			console.error('[templates] azsubject import failed:', err)
			toast.add({ title: 'Fach importieren fehlgeschlagen', color: 'error' })
		}
	}

	async function onDownloadSubject(subjectId: string) {
		try {
			if (typeof window === 'undefined' || !setId.value) return
			const payload = await templatesStore.exportSubject(setId.value, subjectId)
			if (!payload) {
				toast.add({ title: 'Fach exportieren fehlgeschlagen', color: 'error' })
				return
			}

			const json = JSON.stringify(payload, null, 2)
			const blob = new Blob([json], { type: 'application/json' })
			const url = URL.createObjectURL(blob)

			const a = document.createElement('a')
			a.href = url
			a.download = `${sanitizeFilenamePart(payload.subject.label)}.azsubject`
			a.click()
			URL.revokeObjectURL(url)

			toast.add({ title: 'Fach exportiert' })
		} catch (err) {
			console.error('[templates] azsubject export failed:', err)
			toast.add({ title: 'Fach exportieren fehlgeschlagen', color: 'error' })
		}
	}

	function onClickImportSubject() {
		importFileInput.value?.click()
	}

	async function onImportSubjectFileChange(event: Event) {
		const input = event.target as HTMLInputElement | null
		const file = input?.files?.[0]
		if (!file) return
		if (input) input.value = ''

		try {
			const rawText = await file.text()
			let payload: unknown

			try {
				payload = JSON.parse(rawText)
			} catch {
				toast.add({ title: 'Import fehlgeschlagen', color: 'error' })
				return
			}

			const parsed = AzSubjectExportPayloadSchema.safeParse(payload)
			if (!parsed.success) {
				toast.add({ title: 'Import fehlgeschlagen: Ungültiges Dateiformat', color: 'error' })
				return
			}

			pendingImportPayload.value = parsed.data
			if (hasCollision.value) {
				collisionModalOpen.value = true
				return
			}

			await finalizeSubjectImport('duplicate')
		} catch (err) {
			console.error('[templates] azsubject import failed:', err)
			toast.add({ title: 'Fach importieren fehlgeschlagen', color: 'error' })
		}
	}

	function cancelSubjectImport() {
		resetPendingImport()
	}

	async function replaceImportedSubject() {
		await finalizeSubjectImport('replace')
	}

	async function duplicateImportedSubject() {
		await finalizeSubjectImport('duplicate')
	}

	return {
		importFileInput,
		collisionModalOpen,
		importedSubjectLabel,
		onDownloadSubject,
		onClickImportSubject,
		onImportSubjectFileChange,
		cancelSubjectImport,
		replaceImportedSubject,
		duplicateImportedSubject,
	}
}
