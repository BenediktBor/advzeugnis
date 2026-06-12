export type SentencePartEditorType = 'text' | 'genderVariant' | 'name' | 'input' | 'optionalGroup'

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
		case 'optionalGroup':
			return 'Optionale Gruppen bündeln mehrere Bausteine, die gemeinsam ein- oder ausgeblendet werden.'
		default:
			return 'Optionale Gruppen können in der Satzauswahl pro Schüler ein- oder ausgeblendet werden.'
	}
}
