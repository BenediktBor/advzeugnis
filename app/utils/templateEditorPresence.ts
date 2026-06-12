export type TemplateActiveEditor = {
	displayName: string
	image?: string | null
}

export function sortEditorsByDisplayName<T extends TemplateActiveEditor>(editors: T[]): T[] {
	return [...editors].sort((a, b) =>
		a.displayName.localeCompare(b.displayName, 'de', { sensitivity: 'base' }),
	)
}

export function getEditorInitials(displayName: string): string {
	const trimmed = displayName.trim()
	if (!trimmed) return '?'

	const words = trimmed.split(/\s+/).filter(Boolean)
	if (words.length >= 2) {
		return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase()
	}

	const localPart = trimmed.includes('@') ? trimmed.split('@')[0] ?? trimmed : trimmed
	const letters = localPart.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '')
	if (letters.length >= 2) return letters.slice(0, 2).toUpperCase()
	return localPart.slice(0, 2).toUpperCase() || '?'
}

export function formatGermanEditorPresenceText(editors: TemplateActiveEditor[]): string {
	const sorted = sortEditorsByDisplayName(editors)
	if (sorted.length === 0) return ''
	if (sorted.length === 1) {
		return `${sorted[0]!.displayName} bearbeitet diese Vorlage ebenfalls.`
	}
	if (sorted.length === 2) {
		return `${sorted[0]!.displayName} und ${sorted[1]!.displayName} bearbeiten diese Vorlage ebenfalls.`
	}
	if (sorted.length === 3) {
		return `${sorted[0]!.displayName}, ${sorted[1]!.displayName} und ${sorted[2]!.displayName} bearbeiten diese Vorlage ebenfalls.`
	}

	const remainingCount = sorted.length - 2
	const remainingLabel = remainingCount === 1 ? '1 weiterer' : `${remainingCount} weitere`
	return `${sorted[0]!.displayName}, ${sorted[1]!.displayName} und ${remainingLabel} bearbeiten diese Vorlage ebenfalls.`
}

export const TEMPLATE_EDITOR_CONFLICT_PREVENTION_TEXT =
	'Gleichzeitige Änderungen können zu Konflikten führen. Bearbeiten Sie abwechselnd oder laden Sie bei einem Konflikt die Serverversion.'

export const TEMPLATE_EDITOR_CONFLICT_RESOLUTION_TEXT =
	'Die Vorlage wurde von einem anderen Benutzer geändert. Laden Sie die Serverversion oder überschreiben Sie sie mit Ihrer lokalen Version.'
