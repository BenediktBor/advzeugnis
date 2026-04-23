import { produce } from 'immer'
import type { MaybeRefOrGetter } from 'vue'
import { toRaw, toValue } from 'vue'
import { useTemplatesStore } from '~/stores/templates'
import { randomId } from '~/utils/randomId'
import type {
	SentencePart,
	Subject,
	TemplateSet,
	Variant,
} from '~/types/template'

export type SetWithData = {
	id: string
	label: string
	subjects: string[]
}

export function useTemplateSets() {
	const store = useTemplatesStore()
	store.load()

	const orderedIds = computed(() => store.orderedIds)

	const setsWithData = computed<SetWithData[]>(() =>
		store.orderedIds.map((setId) => {
			const setData = store.getSetData(setId)
			const subjects = (setData?.subjects ?? [])
				.filter((s): s is Subject => s != null)
				.map((s) => s.label)
			return { id: setId, label: setData?.label ?? '', subjects }
		})
	)

	const hasAnyTemplateSets = computed(() => store.orderedIds.length > 0)

	function getSetLabel(setId: string): string {
		return store.getSetLabel(setId)
	}

	return {
		orderedIds,
		setsWithData,
		hasAnyTemplateSets,
		isLoaded: computed(() => store.isLoaded),
		addSet: store.addSet,
		removeSet: store.removeSet,
		getSetLabel,
	}
}

export function useTemplates(setIdRef: MaybeRefOrGetter<string>) {
	const store = useTemplatesStore()
	store.load()

	const setId = computed(() => toValue(setIdRef))

	const setRef = computed<TemplateSet | null>(() => store.getSetData(setId.value))

	function getSet(): TemplateSet | null {
		return setRef.value
	}

	function ensureSet(): TemplateSet | null {
		if (!setId.value) return null
		return setRef.value ?? store.ensureSet(setId.value)
	}

	function save(setData: TemplateSet) {
		if (!setId.value) return
		store.saveSetData(setId.value, setData)
	}

	function updateSet(recipe: (draft: TemplateSet) => void) {
		const currentSet = ensureSet()
		if (!currentSet) return
		save(produce(toRaw(currentSet), recipe))
	}

	// --- Subjects ---

	function addSubject(label?: string): string {
		const id = randomId()
		updateSet((draft) => {
			draft.subjects.push({ id, label: label?.trim() || 'Neues Fach', categories: [] })
		})
		return id
	}

	function deleteSubject(subjectId: string) {
		updateSet((draft) => {
			draft.subjects = draft.subjects.filter((s) => s.id !== subjectId)
		})
	}

	function updateSubjectLabel(subjectId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (s) s.label = label
		})
	}

	function reorderSubject(oldIndex: number, newIndex: number) {
		if (oldIndex === newIndex) return
		updateSet((draft) => {
			const removed = draft.subjects.splice(oldIndex, 1)[0]
			if (removed) draft.subjects.splice(newIndex, 0, removed)
		})
	}

	// --- Categories ---

	function addCategory(subjectId: string, label?: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (!s) return
			s.categories.push({ id, label: label?.trim() || 'Neue Kategorie', grades: [] })
		})
		return id
	}

	function deleteCategory(subjectId: string, categoryId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			if (!s) return
			s.categories = s.categories.filter((c) => c.id !== categoryId)
		})
	}

	function updateCategoryLabel(subjectId: string, categoryId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (c) c.label = label
		})
	}

	function reorderCategory(fromSubjectId: string, oldIndex: number, newIndex: number, toSubjectId: string = fromSubjectId) {
		if (fromSubjectId === toSubjectId && oldIndex === newIndex) return
		updateSet((draft) => {
			const fromSubject = draft.subjects.find((s) => s.id === fromSubjectId)
			if (!fromSubject) return
			const removed = fromSubject.categories.splice(oldIndex, 1)[0]
			if (!removed) return
			if (fromSubjectId === toSubjectId) {
				fromSubject.categories.splice(newIndex, 0, removed)
			} else {
				const toSubject = draft.subjects.find((s) => s.id === toSubjectId)
				if (!toSubject) {
					fromSubject.categories.splice(oldIndex, 0, removed)
					return
				}
				const clampedIndex = Math.max(0, Math.min(newIndex, toSubject.categories.length))
				toSubject.categories.splice(clampedIndex, 0, removed)
			}
		})
	}

	// --- Grades ---

	function addGrade(subjectId: string, categoryId: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (!c) return
			c.grades.push({
				id,
				label: String(c.grades.length + 1),
				variants: [{ id: randomId(), label: '1', sentences: [] }],
			})
		})
		return id
	}

	function deleteGrade(subjectId: string, categoryId: string, gradeId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			if (!c) return
			c.grades = c.grades.filter((g) => g.id !== gradeId)
		})
	}

	function updateGradeLabel(subjectId: string, categoryId: string, gradeId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (g) g.label = label
		})
	}

	// --- Variants ---

	function addVariant(subjectId: string, categoryId: string, gradeId: string): string {
		const id = randomId()
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			g.variants.push({ id, label: String(g.variants.length + 1), sentences: [] })
		})
		return id
	}

	function deleteVariant(subjectId: string, categoryId: string, gradeId: string, variantId: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			g.variants = g.variants.filter((v) => v.id !== variantId)
		})
	}

	function updateVariantLabel(subjectId: string, categoryId: string, gradeId: string, variantId: string, label: string) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			const v = g?.variants.find((v) => v.id === variantId)
			if (v) v.label = label
		})
	}

	// --- Sentence Parts ---

	function findVariant(draft: TemplateSet, sId: string, cId: string, gId: string, vId: string): Variant | undefined {
		return draft.subjects.find((s) => s.id === sId)
			?.categories.find((c) => c.id === cId)
			?.grades.find((g) => g.id === gId)
			?.variants.find((v) => v.id === vId)
	}

	function addSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, part: SentencePart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v) v.sentences.push(part)
		})
	}

	function updateSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndex: number, part: SentencePart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v && partIndex >= 0 && partIndex < v.sentences.length) {
				v.sentences[partIndex] = part
			}
		})
	}

	function deleteSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v) v.sentences.splice(partIndex, 1)
		})
	}

	function reorderSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const removed = v.sentences.splice(fromIndex, 1)[0]
			if (removed) v.sentences.splice(toIndex, 0, removed)
		})
	}

	return {
		setRef,
		getSet,
		isLoaded: computed(() => store.isLoaded),
		save,
		addSubject,
		deleteSubject,
		updateSubjectLabel,
		reorderSubject,
		addCategory,
		deleteCategory,
		updateCategoryLabel,
		reorderCategory,
		addGrade,
		deleteGrade,
		updateGradeLabel,
		addVariant,
		deleteVariant,
		updateVariantLabel,
		addSentencePart,
		updateSentencePart,
		deleteSentencePart,
		reorderSentenceParts,
	}
}
