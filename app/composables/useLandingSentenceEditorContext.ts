import type { InjectionKey } from 'vue'
import type { LocalSentencePartsEditor } from '~/composables/useLocalSentencePartsEditor'

const landingSentenceEditorKey = Symbol('landingSentenceEditor') as InjectionKey<LocalSentencePartsEditor>

export function provideLandingSentenceEditor(editor: LocalSentencePartsEditor) {
	provide(landingSentenceEditorKey, editor)
}

export function useLandingSentenceEditorContext(): LocalSentencePartsEditor {
	const editor = inject(landingSentenceEditorKey)
	if (!editor) {
		throw new Error('useLandingSentenceEditorContext must be used within a provider')
	}
	return editor
}
