import { AzSetExportPayloadSchema, type AzSetExportPayload } from '~/schemas/template'
import { useTemplatesStore } from '~/stores/templates'

function sanitizeFilenamePart(label: string): string {
	const normalized = label
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()

	return normalized || 'vorlagensatz'
}

export function useAdvZeUTemplatesImportExport() {
	const templatesStore = useTemplatesStore()
	const toast = useToast()
	const importDialog = useConfirmDialog()
	const importFileInput = ref<HTMLInputElement | null>(null)
	const pendingImportPayload = ref<AzSetExportPayload | null>(null)

	const azsetOverwriteWarning =
		'Der Import behält vorhandene Vorlagensätze, ersetzt Vorlagensätze mit derselben ID und fügt neue Vorlagensätze hinzu. Bereits erstellte Schüler können betroffen sein: Wenn sich in ersetzten Vorlagensätzen gespeicherte Auswahl-IDs für Kategorien oder Varianten ändern, greift der Schüler-Editor automatisch auf passende Standardwerte zurück und die Textausgabe kann sich ändern.'

	function downloadAzsetPayload(payload: AzSetExportPayload, filename: string) {
		const json = JSON.stringify(payload, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)

		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	async function onDownloadAzset() {
		try {
			if (typeof window === 'undefined') return
			const payload = await templatesStore.exportAllAzset()
			downloadAzsetPayload(payload, 'advanced-zeugnis-templates.azset')

			// Keep toast styling consistent: no explicit "success" color.
			toast.add({ title: 'Vorlagen exportiert' })
		} catch (err) {
			console.error('[templates] azset export failed:', err)
			toast.add({ title: 'Vorlagen exportieren fehlgeschlagen', color: 'error' })
		}
	}

	async function onDownloadAzsetForSet(setId: string) {
		try {
			if (typeof window === 'undefined' || !setId) return
			const payload = await templatesStore.exportAzsetForSet(setId)
			if (!payload) {
				toast.add({ title: 'Vorlagensatz exportieren fehlgeschlagen', color: 'error' })
				return
			}

			const label = payload.templateSets[setId]?.label ?? ''
			downloadAzsetPayload(payload, `${sanitizeFilenamePart(label)}.azset`)

			toast.add({ title: 'Vorlagensatz exportiert' })
		} catch (err) {
			console.error('[templates] single azset export failed:', err)
			toast.add({ title: 'Vorlagensatz exportieren fehlgeschlagen', color: 'error' })
		}
	}

	function onClickImportAzset() {
		importFileInput.value?.click()
	}

	async function onImportAzsetFileChange(event: Event) {
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

			const parsed = AzSetExportPayloadSchema.safeParse(payload)
			if (!parsed.success) {
				toast.add({ title: 'Import fehlgeschlagen: Ungültiges Dateiformat', color: 'error' })
				return
			}

			pendingImportPayload.value = parsed.data

			importDialog.show({
				title: 'Vorlagen importieren?',
				description: azsetOverwriteWarning,
				onConfirm: async () => {
					if (!pendingImportPayload.value) return
					await templatesStore.mergeFromAzset(pendingImportPayload.value)
					toast.add({ title: 'Vorlagen importiert' })
					pendingImportPayload.value = null
				},
			})
		} catch (err) {
			console.error('[templates] azset import failed:', err)
			toast.add({ title: 'Vorlagen importieren fehlgeschlagen', color: 'error' })
		}
	}

	return {
		importDialog,
		importFileInput,
		onDownloadAzset,
		onDownloadAzsetForSet,
		onClickImportAzset,
		onImportAzsetFileChange,
	}
}

