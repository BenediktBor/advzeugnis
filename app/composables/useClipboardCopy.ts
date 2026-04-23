export function useClipboardCopy() {
	const toast = useToast()

	async function copyToClipboard(text: string, successMessage = 'In Zwischenablage kopiert') {
		try {
			await navigator.clipboard.writeText(text)
			toast.add({ title: successMessage, color: 'success' })
		} catch {
			toast.add({ title: 'Kopieren fehlgeschlagen', color: 'error' })
		}
	}

	return { copyToClipboard }
}
