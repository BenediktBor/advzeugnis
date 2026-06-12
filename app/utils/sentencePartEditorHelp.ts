export type SentencePartEditorType = 'text' | 'genderVariant' | 'name' | 'input' | 'select' | 'optionalGroup'

export function parseSelectOptionsText(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
}

export function formatSelectOptionsText(options: string[]): string {
	return options.join('\n')
}

export function selectPartPillLabel(options: string[]): string {
	const items = options.map((option) => option.trim()).filter(Boolean)
	if (items.length === 0) return 'Auswahl'
	const preview = items.slice(0, 3).join('/')
	return items.length > 3 ? `Auswahl (${preview}/…)` : `Auswahl (${preview})`
}

export function getSentencePartEditorHelp(partType: SentencePartEditorType): string {
	switch (partType) {
		case 'text':
			return 'Fester Text erscheint immer genau so in der Textausgabe.'
		case 'genderVariant':
			return 'Variabler Text wechselt je nach Geschlecht des Schülers.'
		case 'name':
			return 'Name setzt den Schülernamen ein und kann später durch Pronomen ersetzt werden.'
		case 'input':
			return 'Eingabe erlaubt freien Text in der Satzvorschau pro Schüler.'
		case 'select':
			return 'Auswahl bietet vordefinierte Optionen zur Auswahl in der Satzvorschau pro Schüler.'
		case 'optionalGroup':
			return 'Optionale Gruppen bündeln mehrere Bausteine, die gemeinsam ein- oder ausgeblendet werden.'
		default:
			return 'Optionale Gruppen können in der Satzauswahl pro Schüler ein- oder ausgeblendet werden.'
	}
}
