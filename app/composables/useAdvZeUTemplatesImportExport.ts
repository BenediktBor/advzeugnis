import { AdvZeUExportPayloadSchema, type AdvZeUExportPayload } from '~/schemas/template'
import { useTemplatesStore } from '~/stores/templates'

export function useAdvZeUTemplatesImportExport() {
	const templatesStore = useTemplatesStore()
	const toast = useToast()
	const importDialog = useConfirmDialog()
	const importFileInput = ref<HTMLInputElement | null>(null)
	const pendingImportPayload = ref<AdvZeUExportPayload | null>(null)

	const advzeuOverwriteWarning =
		'Der Import behält vorhandene Vorlagensätze, ersetzt Vorlagensätze mit derselben ID und fügt neue Vorlagensätze hinzu. Bereits erstellte Schüler können betroffen sein: Wenn sich in ersetzten Vorlagensätzen gespeicherte Auswahl-IDs für Kategorien oder Varianten ändern, greift der Schüler-Editor automatisch auf passende Standardwerte zurück und die Textausgabe kann sich ändern.'

	async function onDownloadAdvzeu() {
		try {
			if (typeof window === 'undefined') return
			const payload = await templatesStore.exportAllAdvzeu()

			const json = JSON.stringify(payload, null, 2)
			const blob = new Blob([json], { type: 'application/json' })
			const url = URL.createObjectURL(blob)

			const a = document.createElement('a')
			a.href = url
			a.download = 'advanced-zeugnis-templates.advzeu'
			a.click()
			URL.revokeObjectURL(url)

			// Keep toast styling consistent: no explicit "success" color.
			toast.add({ title: 'Vorlagen exportiert' })
		} catch (err) {
			console.error('[templates] advzeu export failed:', err)
			toast.add({ title: 'Vorlagen exportieren fehlgeschlagen', color: 'error' })
		}
	}

	function onClickImportAdvzeu() {
		importFileInput.value?.click()
	}

	async function onImportAdvzeuFileChange(event: Event) {
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

			const parsed = AdvZeUExportPayloadSchema.safeParse(payload)
			if (!parsed.success) {
				toast.add({ title: 'Import fehlgeschlagen: Ungültiges Dateiformat', color: 'error' })
				return
			}

			pendingImportPayload.value = parsed.data

			importDialog.show({
				title: 'Vorlagen importieren?',
				description: advzeuOverwriteWarning,
				onConfirm: async () => {
					if (!pendingImportPayload.value) return
					await templatesStore.mergeFromAdvzeu(pendingImportPayload.value)
					toast.add({ title: 'Vorlagen importiert' })
					pendingImportPayload.value = null
				},
			})
		} catch (err) {
			console.error('[templates] advzeu import failed:', err)
			toast.add({ title: 'Vorlagen importieren fehlgeschlagen', color: 'error' })
		}
	}

	return {
		importDialog,
		importFileInput,
		onDownloadAdvzeu,
		onClickImportAdvzeu,
		onImportAdvzeuFileChange,
	}
}

