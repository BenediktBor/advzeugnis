import { produce } from 'immer'
import type { MaybeRefOrGetter } from 'vue'
import { toRaw, toValue } from 'vue'
import { useTemplatesStore } from '~/stores/templates'
import { randomId } from '~/utils/randomId'
import type {
	Grade,
	OptionalGroupChildPart,
	SentencePart,
	SentencePartPath,
	Subject,
	TemplateSet,
	Variant,
} from '~/types/template'

export type SetWithData = {
	id: string
	label: string
	subjects: string[]
	subjectPreview: string[]
	remainingSubjectCount: number
	subjectCount: number
	categoryCount: number
	gradeCount: number
	variantCount: number
}

export function useTemplateSets() {
	const store = useTemplatesStore()
	store.load()

	const orderedIds = computed(() => store.orderedIds)

	const setsWithData = computed<SetWithData[]>(() =>
		store.orderedIds.map((setId) => {
			const setData = store.getSetData(setId)
			const subjects = (setData?.subjects ?? []).filter(
				(s): s is Subject => s != null,
			)
			const subjectLabels = subjects.map((s) => s.label)
			const categoryCount = subjects.reduce(
				(total, subject) => total + subject.categories.length,
				0,
			)
			const gradeCount = subjects.reduce(
				(total, subject) =>
					total +
					subject.categories.reduce(
						(categoryTotal, category) => categoryTotal + category.grades.length,
						0,
					),
				0,
			)
			const variantCount = subjects.reduce(
				(total, subject) =>
					total +
					subject.categories.reduce(
						(categoryTotal, category) =>
							categoryTotal +
							category.grades.reduce(
								(gradeTotal, grade) => gradeTotal + grade.variants.length,
								0,
							),
						0,
					),
				0,
			)
			const subjectPreview = subjectLabels.slice(0, 4)

			return {
				id: setId,
				label: setData?.label ?? '',
				subjects: subjectLabels,
				subjectPreview,
				remainingSubjectCount: Math.max(0, subjectLabels.length - subjectPreview.length),
				subjectCount: subjectLabels.length,
				categoryCount,
				gradeCount,
				variantCount,
			}
		})
	)

	const sortedSetsWithData = computed<SetWithData[]>(() =>
		[...setsWithData.value].sort((a, b) =>
			a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }),
		),
	)

	const defaultAlphabeticalTemplateSetId = computed(
		() => sortedSetsWithData.value[0]?.id ?? '',
	)

	const hasAnyTemplateSets = computed(() => store.orderedIds.length > 0)

	function getSetLabel(setId: string): string {
		return store.getSetLabel(setId)
	}

	function getSetData(setId: string): TemplateSet | null {
		return store.getSetData(setId)
	}

	return {
		orderedIds,
		setsWithData,
		sortedSetsWithData,
		defaultAlphabeticalTemplateSetId,
		hasAnyTemplateSets,
		isLoaded: computed(() => store.isLoaded),
		loadError: computed(() => store.loadError),
		addSet: store.addSet,
		removeSet: store.removeSet,
		getSetLabel,
		getSetData,
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

	function updateGradeValue(subjectId: string, categoryId: string, gradeId: string, value: number | null) {
		updateSet((draft) => {
			const s = draft.subjects.find((s) => s.id === subjectId)
			const c = s?.categories.find((c) => c.id === categoryId)
			const g = c?.grades.find((g) => g.id === gradeId)
			if (!g) return
			if (value === null) {
				delete g.value
			} else {
				g.value = value
			}
		})
	}

	function reorderGrades(subjectId: string, categoryId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			const removed = c.grades.splice(fromIndex, 1)[0]
			if (removed) c.grades.splice(toIndex, 0, removed)
		})
	}

	function insertGrades(subjectId: string, categoryId: string, grades: Grade[], atIndex?: number) {
		if (!grades.length) return
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			const index = atIndex === undefined
				? c.grades.length
				: Math.max(0, Math.min(atIndex, c.grades.length))
			c.grades.splice(index, 0, ...grades)
		})
	}

	function deleteGrades(subjectId: string, categoryId: string, gradeIds: string[]) {
		if (!gradeIds.length) return
		const ids = new Set(gradeIds)
		updateSet((draft) => {
			const c = draft.subjects.find((s) => s.id === subjectId)?.categories.find((cat) => cat.id === categoryId)
			if (!c) return
			c.grades = c.grades.filter((grade) => !ids.has(grade.id))
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

	function reorderVariants(subjectId: string, categoryId: string, gradeId: string, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			const removed = g.variants.splice(fromIndex, 1)[0]
			if (removed) g.variants.splice(toIndex, 0, removed)
		})
	}

	function insertVariants(subjectId: string, categoryId: string, gradeId: string, variants: Variant[], atIndex?: number) {
		if (!variants.length) return
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			const index = atIndex === undefined
				? g.variants.length
				: Math.max(0, Math.min(atIndex, g.variants.length))
			g.variants.splice(index, 0, ...variants)
		})
	}

	function deleteVariants(subjectId: string, categoryId: string, gradeId: string, variantIds: string[]) {
		if (!variantIds.length) return
		const ids = new Set(variantIds)
		updateSet((draft) => {
			const g = draft.subjects.find((s) => s.id === subjectId)
				?.categories.find((c) => c.id === categoryId)
				?.grades.find((grade) => grade.id === gradeId)
			if (!g) return
			g.variants = g.variants.filter((variant) => !ids.has(variant.id))
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

	function findOptionalGroup(variant: Variant, groupIndex: number) {
		const group = variant.sentences[groupIndex]
		return group?.type === 'optionalGroup' ? group : null
	}

	function addOptionalGroupPart(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, part: OptionalGroupChildPart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			group?.parts.push(part)
		})
	}

	function insertOptionalGroupParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, parts: OptionalGroupChildPart[], atIndex?: number) {
		if (!parts.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			if (!group) return
			const index = atIndex === undefined
				? group.parts.length
				: Math.max(0, Math.min(atIndex, group.parts.length))
			group.parts.splice(index, 0, ...parts)
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

	function updateSentencePartAtPath(subjectId: string, categoryId: string, gradeId: string, variantId: string, path: SentencePartPath, part: SentencePart | OptionalGroupChildPart) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			if (path.childIndex === undefined) {
				if (path.partIndex >= 0 && path.partIndex < v.sentences.length) {
					v.sentences[path.partIndex] = part as SentencePart
				}
				return
			}
			if (part.type === 'optionalGroup') return
			const group = findOptionalGroup(v, path.partIndex)
			if (group && path.childIndex >= 0 && path.childIndex < group.parts.length) {
				group.parts[path.childIndex] = part
			}
		})
	}

	function deleteSentencePart(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (v) v.sentences.splice(partIndex, 1)
		})
	}

	function deleteSentencePartAtPath(subjectId: string, categoryId: string, gradeId: string, variantId: string, path: SentencePartPath) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			if (path.childIndex === undefined) {
				v.sentences.splice(path.partIndex, 1)
				return
			}
			const group = findOptionalGroup(v, path.partIndex)
			if (group) group.parts.splice(path.childIndex, 1)
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

	function reorderOptionalGroupParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, fromIndex: number, toIndex: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			const group = v ? findOptionalGroup(v, groupIndex) : null
			if (!group) return
			const removed = group.parts.splice(fromIndex, 1)[0]
			if (removed) group.parts.splice(toIndex, 0, removed)
		})
	}

	function moveSentencePartToOptionalGroup(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromIndex: number, groupIndex: number, childIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v || fromIndex === groupIndex) return
			const part = v.sentences[fromIndex]
			if (!part || part.type === 'optionalGroup') return
			const group = findOptionalGroup(v, groupIndex)
			if (!group) return
			const [removed] = v.sentences.splice(fromIndex, 1)
			if (!removed || removed.type === 'optionalGroup') return
			const index = childIndex === undefined
				? group.parts.length
				: Math.max(0, Math.min(childIndex, group.parts.length))
			group.parts.splice(index, 0, removed)
		})
	}

	function moveOptionalGroupPartToRoot(subjectId: string, categoryId: string, gradeId: string, variantId: string, groupIndex: number, childIndex: number, toIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const group = findOptionalGroup(v, groupIndex)
			if (!group) return
			const [removed] = group.parts.splice(childIndex, 1)
			if (!removed) return
			const index = toIndex === undefined
				? v.sentences.length
				: Math.max(0, Math.min(toIndex, v.sentences.length))
			v.sentences.splice(index, 0, removed)
		})
	}

	function moveOptionalGroupPartToOptionalGroup(subjectId: string, categoryId: string, gradeId: string, variantId: string, fromGroupIndex: number, childIndex: number, toGroupIndex: number, toChildIndex?: number) {
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const fromGroup = findOptionalGroup(v, fromGroupIndex)
			const toGroup = findOptionalGroup(v, toGroupIndex)
			if (!fromGroup || !toGroup) return
			const [removed] = fromGroup.parts.splice(childIndex, 1)
			if (!removed) return
			const insertionLimit = fromGroup === toGroup ? fromGroup.parts.length : toGroup.parts.length
			const index = toChildIndex === undefined
				? insertionLimit
				: Math.max(0, Math.min(toChildIndex, insertionLimit))
			toGroup.parts.splice(index, 0, removed)
		})
	}

	function insertSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, parts: SentencePart[], atIndex?: number) {
		if (!parts.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			const index = atIndex === undefined
				? v.sentences.length
				: Math.max(0, Math.min(atIndex, v.sentences.length))
			v.sentences.splice(index, 0, ...parts)
		})
	}

	function deleteSentenceParts(subjectId: string, categoryId: string, gradeId: string, variantId: string, partIndexes: number[]) {
		if (!partIndexes.length) return
		const sortedIndexes = [...new Set(partIndexes)]
			.filter((index) => Number.isInteger(index) && index >= 0)
			.sort((a, b) => b - a)
		if (!sortedIndexes.length) return
		updateSet((draft) => {
			const v = findVariant(draft, subjectId, categoryId, gradeId, variantId)
			if (!v) return
			for (const index of sortedIndexes) {
				if (index < v.sentences.length) v.sentences.splice(index, 1)
			}
		})
	}

	return {
		setRef,
		getSet,
		isLoaded: computed(() => store.isLoaded),
		loadError: computed(() => store.loadError),
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
		updateGradeValue,
		reorderGrades,
		insertGrades,
		deleteGrades,
		addVariant,
		deleteVariant,
		updateVariantLabel,
		reorderVariants,
		insertVariants,
		deleteVariants,
		addSentencePart,
		addOptionalGroupPart,
		insertOptionalGroupParts,
		updateSentencePart,
		updateSentencePartAtPath,
		deleteSentencePart,
		deleteSentencePartAtPath,
		reorderSentenceParts,
		reorderOptionalGroupParts,
		moveSentencePartToOptionalGroup,
		moveOptionalGroupPartToRoot,
		moveOptionalGroupPartToOptionalGroup,
		insertSentenceParts,
		deleteSentenceParts,
	}
}
