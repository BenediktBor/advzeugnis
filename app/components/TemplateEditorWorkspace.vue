<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { Category, Grade, OptionalGroupChildPart, SentencePart, SentencePartPath, Subject, TemplateSet, Variant } from '~/types/template'
import { useTemplatesStore } from '~/stores/templates'
import { useTemplateClipboardStore } from '~/stores/templateClipboard'
import {
	cloneClipboardItemsForPaste,
	createTemplateClipboardPayload,
} from '~/utils/templateClipboard'

const props = defineProps<{
	setId: string
	templateSet: TemplateSet
}>()

const templatesStore = useTemplatesStore()
const { removeSet } = useTemplateSets()
const deleteDialog = useConfirmDialog()
const {
	addSubject,
	deleteSubject,
	insertSubjects,
	deleteSubjects,
	reorderSubject,
	addCategory,
	deleteCategory,
	insertCategories,
	deleteCategories,
	reorderCategory,
	addGrade,
	deleteGrade,
	updateSubjectLabel,
	updateCategoryLabel,
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
	deleteSentencePartAtPath,
	reorderSentenceParts,
	reorderOptionalGroupParts,
	moveSentencePartToOptionalGroup,
	moveOptionalGroupPartToRoot,
	moveOptionalGroupPartToOptionalGroup,
	insertSentenceParts,
	deleteSentenceParts,
	isSyncPending,
	syncError,
	retrySync,
} = useTemplates(computed(() => props.setId))
const { canEditTemplates } = useCurrentUser()
const templateClipboard = useTemplateClipboardStore()
templateClipboard.load()

const selectedCategory = ref<{ subjectId: string; categoryId: string } | null>(null)
type CategorySelection = {
	gradeId: string | null
	variantId: string | null
}
type ChipSelectionKind = 'subject' | 'category' | 'grade' | 'variant' | 'sentencePart'
type ChipSelection = {
	kind: ChipSelectionKind
	scopeKey: string
	ids: string[]
	anchorId: string | null
}
type ClipboardAction = 'copy' | 'cut' | 'paste'

const chipSelection = ref<ChipSelection | null>(null)

function subjectScopeKey() {
	return `${props.setId}:subjects`
}

function categoryScopeKey(subjectId = selectedCategory.value?.subjectId) {
	if (!subjectId) return ''
	return `${props.setId}:${subjectId}:categories`
}

function gradeScopeKey() {
	const category = selectedCategory.value
	if (!category) return ''
	return `${props.setId}:${category.subjectId}:${category.categoryId}:grades`
}

function variantScopeKey() {
	const category = selectedCategory.value
	if (!category || !selectedGradeId.value) return ''
	return `${props.setId}:${category.subjectId}:${category.categoryId}:${selectedGradeId.value}:variants`
}

function sentencePartScopeKey() {
	const category = selectedCategory.value
	if (!category || !selectedGradeId.value || !selectedVariantId.value) return ''
	return `${props.setId}:${category.subjectId}:${category.categoryId}:${selectedGradeId.value}:${selectedVariantId.value}:sentenceParts`
}

function selectionScopeKey(kind: ChipSelectionKind): string {
	if (kind === 'subject') return subjectScopeKey()
	if (kind === 'category') return categoryScopeKey()
	if (kind === 'grade') return gradeScopeKey()
	if (kind === 'variant') return variantScopeKey()
	return sentencePartScopeKey()
}

function clearChipSelection() {
	chipSelection.value = null
}

function selectedChipIds(kind: ChipSelectionKind, scopeKey = selectionScopeKey(kind)): string[] {
	const selection = chipSelection.value
	if (!selection || selection.kind !== kind || selection.scopeKey !== scopeKey) return []
	return selection.ids
}

function selectedChipIndexes(kind: ChipSelectionKind, scopeKey = selectionScopeKey(kind)): number[] {
	return selectedChipIds(kind, scopeKey)
		.map((id) => Number(id))
		.filter((index) => Number.isInteger(index) && index >= 0)
}

function hasSelectionModifier(event: MouseEvent | KeyboardEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey
}

function setSingleChipSelection(kind: ChipSelectionKind, id: string) {
	const scopeKey = selectionScopeKey(kind)
	if (!scopeKey) return
	chipSelection.value = { kind, scopeKey, ids: [id], anchorId: id }
}

function updateChipSelection(
	kind: ChipSelectionKind,
	id: string,
	orderedIds: string[],
	event: MouseEvent | KeyboardEvent,
	options: { allowPlainToggle: boolean, scopeKey?: string },
) {
	const scopeKey = options.scopeKey ?? selectionScopeKey(kind)
	if (!scopeKey) return
	const current = chipSelection.value
	const sameSelection = current?.kind === kind && current.scopeKey === scopeKey

	if (event.shiftKey && sameSelection && current?.anchorId) {
		const anchorIndex = orderedIds.indexOf(current.anchorId)
		const targetIndex = orderedIds.indexOf(id)
		if (anchorIndex !== -1 && targetIndex !== -1) {
			const start = Math.min(anchorIndex, targetIndex)
			const end = Math.max(anchorIndex, targetIndex)
			chipSelection.value = {
				kind,
				scopeKey,
				ids: orderedIds.slice(start, end + 1),
				anchorId: current.anchorId,
			}
			return
		}
	}

	if (event.metaKey || event.ctrlKey) {
		const ids = sameSelection ? [...(current?.ids ?? [])] : []
		const index = ids.indexOf(id)
		if (index >= 0) {
			ids.splice(index, 1)
		} else {
			ids.push(id)
		}
		chipSelection.value = ids.length
			? { kind, scopeKey, ids, anchorId: id }
			: null
		return
	}

	if (options.allowPlainToggle) {
		const alreadyOnlySelected = sameSelection && current?.ids.length === 1 && current.ids[0] === id
		chipSelection.value = alreadyOnlySelected
			? null
			: { kind, scopeKey, ids: [id], anchorId: id }
		return
	}

	clearChipSelection()
}

function categorySelectionKey(category: { subjectId: string; categoryId: string }) {
	return `${category.subjectId}:${category.categoryId}`
}

function getCategorySelection(category: { subjectId: string; categoryId: string } | null): CategorySelection | null {
	if (!category) return null
	return templatesStore.getLastCategorySelection(props.setId, categorySelectionKey(category))
}

function updateCategorySelection(
	category: { subjectId: string; categoryId: string } | null,
	patch: Partial<CategorySelection>
) {
	if (!category) return
	const current = getCategorySelection(category) ?? { gradeId: null, variantId: null }
	templatesStore.setLastCategorySelection(props.setId, categorySelectionKey(category), {
		...current,
		...patch,
	})
}

const selectedGradeId = computed<string | null>({
	get: () => getCategorySelection(selectedCategory.value)?.gradeId ?? null,
	set: (gradeId) => updateCategorySelection(selectedCategory.value, { gradeId }),
})

const selectedVariantId = computed<string | null>({
	get: () => getCategorySelection(selectedCategory.value)?.variantId ?? null,
	set: (variantId) => updateCategorySelection(selectedCategory.value, { variantId }),
})

function getFirstCategorySelection(templateSet: TemplateSet) {
	for (const subject of templateSet.subjects) {
		const firstCategory = subject.categories[0]
		if (firstCategory) {
			return {
				subjectId: subject.id,
				categoryId: firstCategory.id,
			}
		}
	}

	return null
}

function categoryExists(
	templateSet: TemplateSet,
	category: { subjectId: string; categoryId: string } | null,
): category is { subjectId: string; categoryId: string } {
	if (!category) return false
	const subject = templateSet.subjects.find((item) => item.id === category.subjectId)
	return Boolean(subject?.categories.some((item) => item.id === category.categoryId))
}

const selectedCategoryData = computed<Category | null>(() => {
	const selected = selectedCategory.value
	if (!selected) return null

	const subject = props.templateSet.subjects.find((item) => item.id === selected.subjectId)
	return subject?.categories.find((category) => category.id === selected.categoryId) ?? null
})

function selectCategory(category: { subjectId: string; categoryId: string } | null) {
	clearChipSelection()
	selectedCategory.value = category
	const selected = selectedCategoryData.value
	if (!category || !selected) {
		templatesStore.setLastSelectedCategory(props.setId, null)
	}
	else {
		templatesStore.setLastSelectedCategory(props.setId, category)
	}
	const rememberedSelection = getCategorySelection(category)
	if (!selected?.grades.length) {
		updateCategorySelection(category, { gradeId: null, variantId: null })
		return
	}

	const currentGrade = selected.grades.find((grade) => grade.id === rememberedSelection?.gradeId)
	const grade = currentGrade ?? selected.grades[0]
	if (!grade) {
		updateCategorySelection(category, { gradeId: null, variantId: null })
		return
	}

	selectedGradeId.value = grade.id
	if (!grade.variants.length) {
		selectedVariantId.value = null
		return
	}

	const currentVariant = grade.variants.find((variant) => variant.id === rememberedSelection?.variantId)
	selectedVariantId.value = currentVariant?.id ?? grade.variants[0]?.id ?? null
}

watch(
	() => props.setId,
	() => {
		clearChipSelection()
		selectedCategory.value = null
	}
)

watch(
	() => props.templateSet,
	() => {
		if (selectedCategory.value && selectedCategoryData.value) {
			selectCategory(selectedCategory.value)
			return
		}
		if (selectedCategory.value && !selectedCategoryData.value) {
			templatesStore.setLastSelectedCategory(props.setId, null)
		}
		const persisted = templatesStore.getLastSelectedCategory(props.setId)
		if (categoryExists(props.templateSet, persisted)) {
			selectCategory(persisted)
			return
		}
		if (persisted) {
			templatesStore.setLastSelectedCategory(props.setId, null)
		}
		const firstCategory = getFirstCategorySelection(props.templateSet)
		if (firstCategory) {
			selectCategory(firstCategory)
			return
		}
		selectCategory(null)
	},
	{ immediate: true, deep: true },
)

watch(selectedGradeId, () => {
	const category = selectedCategoryData.value
	const grade = category?.grades.find((item) => item.id === selectedGradeId.value)
	if (!grade?.variants.length) {
		selectedVariantId.value = null
		return
	}

	const currentVariant = grade.variants.find((variant) => variant.id === selectedVariantId.value)
	selectedVariantId.value = currentVariant?.id ?? grade.variants[0]?.id ?? null
})

function gradeVariantTitle(category: Category): string {
	return `Noten & Varianten: ${category.label}`
}

function confirmDeleteLabel(label: string): string {
	return `Möchtest du „${label || 'Unbenannt'}" wirklich löschen?`
}

function addGradeAndSelect() {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	const gradeId = addGrade(subjectId, categoryId)
	nextTick(() => {
		selectedGradeId.value = gradeId
		const category = selectedCategoryData.value
		const grade = category?.grades.find((item) => item.id === gradeId)
		selectedVariantId.value = grade?.variants[0]?.id ?? null
	})
}

function addVariantAndSelect() {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	const variantId = addVariant(subjectId, categoryId, selectedGradeId.value)
	nextTick(() => {
		selectedVariantId.value = variantId
	})
}

function handleEditGradeLabel(gradeId: string, currentLabel: string, currentValue: number | undefined) {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditLabelModal(
		currentLabel,
		(label, value) => {
			updateGradeLabel(subjectId, categoryId, gradeId, label)
			updateGradeValue(subjectId, categoryId, gradeId, value ?? null)
		},
		{
			title: 'Notenstufe bearbeiten',
			supportsGradeValue: true,
			gradeValue: currentValue,
		}
	)
}

function handleDeleteGrade(gradeId: string, label: string) {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Notenstufe löschen?',
		description: confirmDeleteLabel(label),
		onConfirm: () => deleteGrade(subjectId, categoryId, gradeId),
	})
}

function handleEditVariantLabel(variantId: string, currentLabel: string) {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditLabelModal(
		currentLabel,
		(label) => updateVariantLabel(subjectId, categoryId, selectedGradeId.value!, variantId, label),
		{ title: 'Variante umbenennen' }
	)
}

function handleDeleteVariant(variantId: string, label: string) {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Variante löschen?',
		description: confirmDeleteLabel(label),
		onConfirm: () => deleteVariant(subjectId, categoryId, selectedGradeId.value!, variantId),
	})
}

function handleEditSentencePart(part: SentencePart | OptionalGroupChildPart, path: SentencePartPath) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditPartModal(part, (_part) => {
		updateSentencePartAtPath(subjectId, categoryId, selectedGradeId.value!, selectedVariantId.value!, path, _part)
	})
}

function handleDeleteSentencePart(path: SentencePartPath) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Satzbaustein löschen?',
		description: 'Möchtest du diesen Baustein wirklich löschen?',
		onConfirm: () =>
			deleteSentencePartAtPath(
				subjectId,
				categoryId,
				selectedGradeId.value!,
				selectedVariantId.value!,
				path,
			),
	})
}

function handleReorderSentenceParts(oldIndex: number, newIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	reorderSentenceParts(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		oldIndex,
		newIndex,
	)
}

function handleReorderOptionalGroupParts(groupIndex: number, oldIndex: number, newIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	reorderOptionalGroupParts(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		groupIndex,
		oldIndex,
		newIndex,
	)
}

function handleMoveSentencePartToGroup(fromIndex: number, groupIndex: number, childIndex?: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	moveSentencePartToOptionalGroup(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		fromIndex,
		groupIndex,
		childIndex,
	)
}

function handleMoveSentencePartFromGroup(groupIndex: number, childIndex: number, toIndex?: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	moveOptionalGroupPartToRoot(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		groupIndex,
		childIndex,
		toIndex,
	)
}

function handleMoveSentencePartBetweenGroups(fromGroupIndex: number, childIndex: number, toGroupIndex: number, toChildIndex?: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	moveOptionalGroupPartToOptionalGroup(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		fromGroupIndex,
		childIndex,
		toGroupIndex,
		toChildIndex,
	)
}

function handleReorderGrades(oldIndex: number, newIndex: number) {
	if (!selectedCategory.value) return
	reorderGrades(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		oldIndex,
		newIndex,
	)
}

function handleReorderVariants(oldIndex: number, newIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value) return
	reorderVariants(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		oldIndex,
		newIndex,
	)
}

function handleToggleOptionalGroupDefault(partIndex: number, enabledByDefault: boolean) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const variant = selectedVariantData()
	const part = variant?.sentences[partIndex]
	if (!part || part.type !== 'optionalGroup') return
	const { subjectId, categoryId } = selectedCategory.value
	updateSentencePart(subjectId, categoryId, selectedGradeId.value, selectedVariantId.value, partIndex, {
		...part,
		enabledByDefault,
	})
}

function selectedVariantData() {
	const category = selectedCategoryData.value
	if (!category || !selectedGradeId.value || !selectedVariantId.value) return null
	const grade = category.grades.find((item) => item.id === selectedGradeId.value)
	return grade?.variants.find((item) => item.id === selectedVariantId.value) ?? null
}

function selectedSubjectData() {
	const ids = selectedChipIds('subject', subjectScopeKey())
	return props.templateSet.subjects.filter((subject) => ids.includes(subject.id))
}

function selectedCategoryItems() {
	const selection = chipSelection.value
	if (!selection || selection.kind !== 'category') return []
	const subject = props.templateSet.subjects.find(
		(item) => categoryScopeKey(item.id) === selection.scopeKey,
	)
	if (!subject) return []
	return subject.categories.filter((category) => selection.ids.includes(category.id))
}

function selectedGradeData() {
	const category = selectedCategoryData.value
	if (!category || !selectedGradeId.value) return null
	return category.grades.find((item) => item.id === selectedGradeId.value) ?? null
}

const canPasteSubjects = computed(() => canEditTemplates.value && templateClipboard.payload?.kind === 'subject')
const canPasteCategories = computed(() => canEditTemplates.value && templateClipboard.payload?.kind === 'category')
const canPasteGrades = computed(() => canEditTemplates.value && templateClipboard.payload?.kind === 'grade')
const canPasteVariants = computed(() => canEditTemplates.value && templateClipboard.payload?.kind === 'variant')
const canPasteSentenceParts = computed(() => canEditTemplates.value && templateClipboard.payload?.kind === 'sentencePart')

const selectedSubjectIdsForTree = computed(() => selectedChipIds('subject', subjectScopeKey()))
const selectedCategoryIdsForTree = computed(() => {
	const selection = chipSelection.value
	return selection?.kind === 'category' ? selection.ids : []
})
const selectedGradeIdsForEditor = computed(() => selectedChipIds('grade', gradeScopeKey()))
const selectedVariantIdsForEditor = computed(() => selectedChipIds('variant', variantScopeKey()))
const selectedSentencePartIdsForEditor = computed(() => selectedChipIds('sentencePart', sentencePartScopeKey()))

function sentencePartPathId(path: SentencePartPath): string {
	return path.childIndex === undefined ? String(path.partIndex) : `${path.partIndex}.${path.childIndex}`
}

function parseSentencePartPath(id: string): SentencePartPath | null {
	const [partIndexRaw, childIndexRaw] = id.split('.')
	const partIndex = Number(partIndexRaw)
	if (!Number.isInteger(partIndex) || partIndex < 0) return null
	if (childIndexRaw === undefined) return { partIndex }
	const childIndex = Number(childIndexRaw)
	if (!Number.isInteger(childIndex) || childIndex < 0) return null
	return { partIndex, childIndex }
}

function sentencePartAtPath(variant: Variant, path: SentencePartPath): SentencePart | OptionalGroupChildPart | null {
	const part = variant.sentences[path.partIndex]
	if (!part) return null
	if (path.childIndex === undefined) return part
	if (part.type !== 'optionalGroup') return null
	return part.parts[path.childIndex] ?? null
}

function orderedSentencePartPathIds(variant: Variant | null): string[] {
	if (!variant) return []
	const ids: string[] = []
	for (const [partIndex, part] of variant.sentences.entries()) {
		ids.push(String(partIndex))
		if (part.type === 'optionalGroup') {
			for (const childIndex of part.parts.keys()) ids.push(`${partIndex}.${childIndex}`)
		}
	}
	return ids
}

function handleSelectSubject(subjectId: string, event: MouseEvent | KeyboardEvent) {
	updateChipSelection(
		'subject',
		subjectId,
		props.templateSet.subjects.map((subject) => subject.id),
		event,
		{ allowPlainToggle: !hasSelectionModifier(event), scopeKey: subjectScopeKey() },
	)
}

function handleSelectTreeCategory(subjectId: string, categoryId: string, event: MouseEvent | KeyboardEvent) {
	selectCategory({ subjectId, categoryId })
	updateChipSelection(
		'category',
		categoryId,
		props.templateSet.subjects.find((subject) => subject.id === subjectId)?.categories.map((category) => category.id) ?? [],
		event,
		{ allowPlainToggle: false, scopeKey: categoryScopeKey(subjectId) },
	)
}

function handleSelectGrade(gradeId: string, event: MouseEvent | KeyboardEvent) {
	selectedGradeId.value = gradeId
	const grade = selectedCategoryData.value?.grades.find((item) => item.id === gradeId)
	selectedVariantId.value = grade?.variants[0]?.id ?? null
	updateChipSelection(
		'grade',
		gradeId,
		selectedCategoryData.value?.grades.map((item) => item.id) ?? [],
		event,
		{ allowPlainToggle: false },
	)
}

function handleSelectVariant(variantId: string, event: MouseEvent | KeyboardEvent) {
	selectedVariantId.value = variantId
	updateChipSelection(
		'variant',
		variantId,
		selectedGradeData()?.variants.map((item) => item.id) ?? [],
		event,
		{ allowPlainToggle: false },
	)
}

function handleSelectSentencePart(path: SentencePartPath, event: MouseEvent | KeyboardEvent) {
	const orderedIds = orderedSentencePartPathIds(selectedVariantData())
	updateChipSelection('sentencePart', sentencePartPathId(path), orderedIds, event, {
		allowPlainToggle: !hasSelectionModifier(event),
	})
}

function handleContextOpen(kind: ChipSelectionKind, id: string, scopeKey = selectionScopeKey(kind)) {
	const current = chipSelection.value
	if (!scopeKey) return
	if (current?.kind === kind && current.scopeKey === scopeKey && current.ids.includes(id)) return
	chipSelection.value = { kind, scopeKey, ids: [id], anchorId: id }
}

function selectedGrades(): Grade[] {
	const category = selectedCategoryData.value
	if (!category) return []
	const ids = selectedChipIds('grade')
	return category.grades.filter((grade) => ids.includes(grade.id))
}

function selectedVariants(): Variant[] {
	const grade = selectedGradeData()
	if (!grade) return []
	const ids = selectedChipIds('variant')
	return grade.variants.filter((variant) => ids.includes(variant.id))
}

function selectedSentenceParts(): SentencePart[] {
	const variant = selectedVariantData()
	if (!variant) return []
	return selectedChipIds('sentencePart')
		.map(parseSentencePartPath)
		.filter((path): path is SentencePartPath => Boolean(path))
		.map((path) => sentencePartAtPath(variant, path))
		.filter((part): part is SentencePart => Boolean(part))
}

function selectedSentencePartPaths(): SentencePartPath[] {
	const paths = selectedChipIds('sentencePart')
		.map(parseSentencePartPath)
		.filter((path): path is SentencePartPath => Boolean(path))
	const selectedRootIndexes = new Set(paths
		.filter((path) => path.childIndex === undefined)
		.map((path) => path.partIndex))
	return paths.filter((path) => path.childIndex === undefined || !selectedRootIndexes.has(path.partIndex))
}

async function copySelection(kind = chipSelection.value?.kind) {
	if (!kind) return
	const sourceLabel = selectedCategoryData.value?.label
	if (kind === 'subject') {
		const items = selectedSubjectData()
		if (items.length) await templateClipboard.setPayload(createTemplateClipboardPayload('subject', items, props.templateSet.label))
		return
	}
	if (kind === 'category') {
		const items = selectedCategoryItems()
		if (items.length) await templateClipboard.setPayload(createTemplateClipboardPayload('category', items, sourceLabel))
		return
	}
	if (kind === 'grade') {
		const items = selectedGrades()
		if (items.length) await templateClipboard.setPayload(createTemplateClipboardPayload('grade', items, sourceLabel))
		return
	}
	if (kind === 'variant') {
		const items = selectedVariants()
		if (items.length) await templateClipboard.setPayload(createTemplateClipboardPayload('variant', items, sourceLabel))
		return
	}
	const items = selectedSentenceParts()
	if (items.length) await templateClipboard.setPayload(createTemplateClipboardPayload('sentencePart', items, sourceLabel))
}

async function cutSelection(kind = chipSelection.value?.kind) {
	if (!canEditTemplates.value || !kind) return
	await copySelection(kind)
	if (kind === 'subject') {
		deleteSubjects(selectedChipIds('subject', subjectScopeKey()))
	} else if (kind === 'category') {
		const selection = chipSelection.value
		const subject = props.templateSet.subjects.find(
			(item) => selection?.kind === 'category' && categoryScopeKey(item.id) === selection.scopeKey,
		)
		if (subject) deleteCategories(subject.id, selection?.ids ?? [])
	} else if (kind === 'grade') {
		const category = selectedCategory.value
		if (!category) return
		const ids = selectedChipIds('grade')
		deleteGrades(category.subjectId, category.categoryId, ids)
	} else if (kind === 'variant') {
		const category = selectedCategory.value
		if (!category) return
		if (!selectedGradeId.value) return
		deleteVariants(category.subjectId, category.categoryId, selectedGradeId.value, selectedChipIds('variant'))
	} else {
		const category = selectedCategory.value
		if (!category) return
		if (!selectedGradeId.value || !selectedVariantId.value) return
		deleteSelectedSentencePartPaths(category.subjectId, category.categoryId, selectedGradeId.value, selectedVariantId.value)
	}
	clearChipSelection()
}

function deleteSelectedSentencePartPaths(subjectId: string, categoryId: string, gradeId: string, variantId: string) {
	const paths = selectedSentencePartPaths()
	const childPaths = paths
		.filter((path) => path.childIndex !== undefined)
		.sort((a, b) => b.partIndex - a.partIndex || (b.childIndex ?? 0) - (a.childIndex ?? 0))
	const rootIndexes = paths
		.filter((path) => path.childIndex === undefined)
		.map((path) => path.partIndex)

	for (const path of childPaths) {
		deleteSentencePartAtPath(subjectId, categoryId, gradeId, variantId, path)
	}
	deleteSentenceParts(subjectId, categoryId, gradeId, variantId, rootIndexes)
}

function pasteSubjectsFromClipboard(afterSubjectId?: string) {
	if (!canPasteSubjects.value || templateClipboard.payload?.kind !== 'subject') return
	const items = cloneClipboardItemsForPaste(templateClipboard.payload) as Subject[]
	const atIndex = afterSubjectId
		? props.templateSet.subjects.findIndex((subject) => subject.id === afterSubjectId) + 1
		: undefined
	insertSubjects(items, atIndex && atIndex > 0 ? atIndex : undefined)
}

function pasteCategoriesFromClipboard(subjectId: string, afterCategoryId?: string) {
	if (!canPasteCategories.value || templateClipboard.payload?.kind !== 'category') return
	const subject = props.templateSet.subjects.find((item) => item.id === subjectId)
	if (!subject) return
	const items = cloneClipboardItemsForPaste(templateClipboard.payload) as Category[]
	const atIndex = afterCategoryId
		? subject.categories.findIndex((category) => category.id === afterCategoryId) + 1
		: undefined
	insertCategories(subjectId, items, atIndex && atIndex > 0 ? atIndex : undefined)
}

function pasteGradesFromClipboard(afterGradeId?: string) {
	if (!canPasteGrades.value || templateClipboard.payload?.kind !== 'grade' || !selectedCategory.value) return
	const items = cloneClipboardItemsForPaste(templateClipboard.payload) as Grade[]
	const atIndex = afterGradeId
		? (selectedCategoryData.value?.grades.findIndex((grade) => grade.id === afterGradeId) ?? -1) + 1
		: undefined
	insertGrades(selectedCategory.value.subjectId, selectedCategory.value.categoryId, items, atIndex && atIndex > 0 ? atIndex : undefined)
}

function pasteVariantsFromClipboard(afterVariantId?: string) {
	if (!canPasteVariants.value || templateClipboard.payload?.kind !== 'variant' || !selectedCategory.value || !selectedGradeId.value) return
	const items = cloneClipboardItemsForPaste(templateClipboard.payload) as Variant[]
	const atIndex = afterVariantId
		? (selectedGradeData()?.variants.findIndex((variant) => variant.id === afterVariantId) ?? -1) + 1
		: undefined
	insertVariants(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		items,
		atIndex && atIndex > 0 ? atIndex : undefined,
	)
}

function pasteSentencePartsFromClipboard(afterPath?: SentencePartPath) {
	if (!canPasteSentenceParts.value || templateClipboard.payload?.kind !== 'sentencePart' || !selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const items = cloneClipboardItemsForPaste(templateClipboard.payload) as SentencePart[]
	const variant = selectedVariantData()
	const targetPart = afterPath && variant ? sentencePartAtPath(variant, { partIndex: afterPath.partIndex }) : null
	const groupIndex = afterPath?.childIndex !== undefined
		? afterPath.partIndex
		: targetPart?.type === 'optionalGroup'
			? afterPath?.partIndex
			: undefined
	if (groupIndex !== undefined) {
		const childParts = items.filter((item): item is OptionalGroupChildPart => item.type !== 'optionalGroup')
		insertOptionalGroupParts(
			selectedCategory.value.subjectId,
			selectedCategory.value.categoryId,
			selectedGradeId.value,
			selectedVariantId.value,
			groupIndex,
			childParts,
			afterPath?.childIndex === undefined ? undefined : afterPath.childIndex + 1,
		)
		return
	}
	insertSentenceParts(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		items,
		afterPath === undefined ? undefined : afterPath.partIndex + 1,
	)
}

async function handleSubjectContextAction(action: ClipboardAction, subjectId: string) {
	handleContextOpen('subject', subjectId, subjectScopeKey())
	if (action === 'copy') await copySelection('subject')
	else if (action === 'cut') await cutSelection('subject')
	else pasteSubjectsFromClipboard(subjectId)
}

async function handleCategoryContextAction(action: ClipboardAction, subjectId: string, categoryId: string) {
	handleContextOpen('category', categoryId, categoryScopeKey(subjectId))
	if (action === 'copy') await copySelection('category')
	else if (action === 'cut') await cutSelection('category')
	else pasteCategoriesFromClipboard(subjectId, categoryId)
}

async function handleGradeContextAction(action: ClipboardAction, gradeId: string) {
	handleContextOpen('grade', gradeId)
	if (action === 'copy') await copySelection('grade')
	else if (action === 'cut') await cutSelection('grade')
	else pasteGradesFromClipboard(gradeId)
}

async function handleVariantContextAction(action: ClipboardAction, variantId: string) {
	handleContextOpen('variant', variantId)
	if (action === 'copy') await copySelection('variant')
	else if (action === 'cut') await cutSelection('variant')
	else pasteVariantsFromClipboard(variantId)
}

async function handleSentencePartContextAction(action: ClipboardAction, path: SentencePartPath) {
	handleContextOpen('sentencePart', sentencePartPathId(path))
	if (action === 'copy') await copySelection('sentencePart')
	else if (action === 'cut') await cutSelection('sentencePart')
	else pasteSentencePartsFromClipboard(path)
}

function isNativeEditingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	const tagName = target.tagName.toLowerCase()
	return tagName === 'input' ||
		tagName === 'textarea' ||
		tagName === 'select' ||
		target.isContentEditable
}

function isModalOpen(): boolean {
	return addPartModalOpen.value ||
		editPartModalOpen.value ||
		editLabelModalOpen.value ||
		deleteDialog.open.value
}

function pasteIntoActiveList() {
	const kind = chipSelection.value?.kind ?? templateClipboard.payload?.kind
	if (kind === 'subject') pasteSubjectsFromClipboard()
	else if (kind === 'category') {
		const selection = chipSelection.value
		const subject = props.templateSet.subjects.find(
			(item) => selection?.kind === 'category' && categoryScopeKey(item.id) === selection.scopeKey,
		)
		const subjectId = subject?.id ?? selectedCategory.value?.subjectId
		if (subjectId) pasteCategoriesFromClipboard(subjectId)
	}
	else if (kind === 'grade') pasteGradesFromClipboard()
	else if (kind === 'variant') pasteVariantsFromClipboard()
	else if (kind === 'sentencePart') pasteSentencePartsFromClipboard()
}

function handleTemplateClipboardKeydown(event: KeyboardEvent) {
	if (isNativeEditingTarget(event.target) || isModalOpen()) return
	if (event.key === 'Escape') {
		if (chipSelection.value) {
			event.preventDefault()
			clearChipSelection()
		}
		return
	}

	const shortcutKey = event.key.toLowerCase()
	if (!(event.metaKey || event.ctrlKey) || event.altKey) return
	if (shortcutKey === 'c') {
		if (!chipSelection.value) return
		event.preventDefault()
		void copySelection()
	} else if (shortcutKey === 'x') {
		if (!chipSelection.value || !canEditTemplates.value) return
		event.preventDefault()
		void cutSelection()
	} else if (shortcutKey === 'v') {
		if (!canEditTemplates.value || !templateClipboard.payload) return
		event.preventDefault()
		pasteIntoActiveList()
	}
}

const addPartModalOpen = ref(false)
type AddPartType = 'text' | 'genderVariant' | 'name' | 'optionalGroup'
const addPartType = ref<AddPartType>('text')
const addPartTargetGroupIndex = ref<number | null>(null)
const addPartText = ref('')
const addPartMale = ref('')
const addPartFemale = ref('')
const addPartOptionalEnabledByDefault = ref(true)
const addPartTabItems = computed(() => {
	const items: Array<{ value: AddPartType; label: string }> = [
		{ value: 'text' as const, label: 'Text' },
		{ value: 'genderVariant' as const, label: 'Variabler Text' },
		{ value: 'name' as const, label: 'Name' },
	]
	if (addPartTargetGroupIndex.value === null) {
		items.push({ value: 'optionalGroup' as const, label: 'Optionale Gruppe' })
	}
	return items
})
const addPartHelp = computed(() => {
	if (addPartType.value === 'text') {
		return 'Fester Text erscheint immer genau so in der Textausgabe.'
	}
	if (addPartType.value === 'genderVariant') {
		return 'Variabler Text wechselt je nach Geschlecht des Schülers.'
	}
	if (addPartType.value === 'name') {
		return 'Name setzt den Schülernamen ein und kann später durch Pronomen ersetzt werden.'
	}
	if (addPartType.value === 'optionalGroup') {
		return 'Optionale Gruppen bündeln mehrere Bausteine, die gemeinsam ein- oder ausgeblendet werden.'
	}
	return 'Optionale Gruppen können in der Satzauswahl pro Schüler ein- oder ausgeblendet werden.'
})
const genderVariantPresets = [
	{ label: 'Er/Sie', male: 'Er', female: 'Sie' },
	{ label: 'er/sie', male: 'er', female: 'sie' },
	{ label: 'Ihn/Sie', male: 'Ihn', female: 'Sie' },
	{ label: 'ihn/sie', male: 'ihn', female: 'sie' },
]

function openAddPartModal(groupIndex: number | null = null) {
	addPartTargetGroupIndex.value = groupIndex
	addPartType.value = 'text'
	addPartText.value = ''
	addPartMale.value = ''
	addPartFemale.value = ''
	addPartOptionalEnabledByDefault.value = true
	addPartModalOpen.value = true
}

function applyGenderVariantPreset(preset: (typeof genderVariantPresets)[number]) {
	addPartType.value = 'genderVariant'
	addPartMale.value = preset.male
	addPartFemale.value = preset.female
	confirmAddPart()
}

const canConfirmAddPart = computed(() => {
	if (addPartType.value === 'text') return addPartText.value.trim() !== ''
	if (addPartType.value === 'genderVariant') {
		return addPartMale.value.trim() !== '' && addPartFemale.value.trim() !== ''
	}
	return true
})

function confirmAddPart() {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value || !canConfirmAddPart.value) return

	let part: SentencePart | OptionalGroupChildPart
	switch (addPartType.value) {
		case 'text':
			part = { type: 'text', value: addPartText.value.trim() }
			break
		case 'genderVariant':
			part = {
				type: 'genderVariant',
				value: [addPartMale.value.trim(), addPartFemale.value.trim()],
			}
			break
		case 'name':
			part = { type: 'name' }
			break
		case 'optionalGroup':
			part = {
				type: 'optionalGroup',
				id: crypto.randomUUID(),
				enabledByDefault: addPartOptionalEnabledByDefault.value,
				parts: [],
			}
			break
		default:
			return
	}

	addPartModalOpen.value = false
	if (addPartTargetGroupIndex.value !== null) {
		if (part.type === 'optionalGroup') return
		addOptionalGroupPart(
			selectedCategory.value.subjectId,
			selectedCategory.value.categoryId,
			selectedGradeId.value,
			selectedVariantId.value,
			addPartTargetGroupIndex.value,
			part,
		)
		return
	}
	addSentencePart(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		part as SentencePart,
	)
}

const editLabelModalOpen = ref(false)
const editLabelTitle = ref('Umbenennen')
const editLabelValue = ref('')
const editLabelSupportsGradeValue = ref(false)
const editLabelGradeValueEnabled = ref(false)
const editLabelGradeValueInput = ref('')
const editLabelCallback = ref<((newLabel: string, gradeValue?: number | null) => void) | null>(null)

type EditLabelOptions = {
	title?: string
	supportsGradeValue?: boolean
	gradeValue?: number
}

function openEditLabelModal(
	currentLabel: string,
	onSave: (newLabel: string, gradeValue?: number | null) => void,
	options: EditLabelOptions = {}
) {
	editLabelTitle.value = options.title ?? 'Umbenennen'
	editLabelValue.value = currentLabel
	editLabelSupportsGradeValue.value = options.supportsGradeValue === true
	editLabelGradeValueEnabled.value = typeof options.gradeValue === 'number'
	editLabelGradeValueInput.value = typeof options.gradeValue === 'number'
		? String(options.gradeValue)
		: ''
	editLabelCallback.value = onSave
	editLabelModalOpen.value = true
}

function getEditLabelGradeValue(): number | null {
	const parsed = Number(editLabelGradeValueInput.value)
	return Number.isFinite(parsed) ? parsed : null
}

const canConfirmEditLabel = computed(() => {
	if (!editLabelValue.value.trim()) return false
	if (!editLabelSupportsGradeValue.value || !editLabelGradeValueEnabled.value) return true
	return getEditLabelGradeValue() !== null
})

function confirmEditLabel() {
	const label = editLabelValue.value.trim()
	if (!canConfirmEditLabel.value || !editLabelCallback.value) return
	const gradeValue = editLabelSupportsGradeValue.value
		? (editLabelGradeValueEnabled.value ? getEditLabelGradeValue() : null)
		: undefined
	editLabelCallback.value(label, gradeValue)
	editLabelModalOpen.value = false
	editLabelCallback.value = null
}

const editPartModalOpen = ref(false)
const editPartType = ref<'text' | 'genderVariant'>('text')
const editPartText = ref('')
const editPartMale = ref('')
const editPartFemale = ref('')
const editPartSaveCallback = ref<((part: OptionalGroupChildPart) => void) | null>(null)

function openEditPartModal(part: SentencePart | OptionalGroupChildPart, onSave: (part: OptionalGroupChildPart) => void) {
	editPartSaveCallback.value = onSave
	if (part.type === 'text') {
		editPartType.value = 'text'
		editPartText.value = part.value
	} else if (part.type === 'genderVariant') {
		editPartType.value = 'genderVariant'
		editPartMale.value = part.value[0] ?? ''
		editPartFemale.value = part.value[1] ?? ''
	} else {
		return
	}
	editPartModalOpen.value = true
}

function confirmEditPart() {
	if (!editPartSaveCallback.value) return
	let part: OptionalGroupChildPart
	if (editPartType.value === 'text') {
		part = { type: 'text', value: editPartText.value }
	} else {
		part = { type: 'genderVariant', value: [editPartMale.value, editPartFemale.value] }
	}

	editPartSaveCallback.value(part)
	editPartModalOpen.value = false
	editPartSaveCallback.value = null
}

const mobileEditorOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 1023px)')
watch([selectedCategory, isMobile], ([category, mobile]) => {
	mobileEditorOpen.value = mobile && !!category
})

const hasSubjects = computed(() => props.templateSet.subjects.length > 0)

function createFirstSubjectAndCategory() {
	const subjectId = addSubject()
	const categoryId = addCategory(subjectId)
	nextTick(() => {
		selectCategory({ subjectId, categoryId })
	})
}

function createFirstCategory() {
	const subjectId = props.templateSet.subjects[0]?.id
	if (!subjectId) return
	const categoryId = addCategory(subjectId)
	nextTick(() => {
		selectCategory({ subjectId, categoryId })
	})
}

onMounted(() => {
	window.addEventListener('keydown', handleTemplateClipboardKeydown)
})

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleTemplateClipboardKeydown)
})
</script>

<template>
	<TemplateTreePanel
		:selected-category="selectedCategory"
		@update:selected-category="selectCategory"
		:set-id="setId"
		:template-set="templateSet"
		:can-edit="canEditTemplates"
		:selected-subject-ids="selectedSubjectIdsForTree"
		:selected-category-ids="selectedCategoryIdsForTree"
		:can-paste-subjects="canPasteSubjects"
		:can-paste-categories="canPasteCategories"
		:add-subject="addSubject"
		:delete-subject="deleteSubject"
		:reorder-subject="reorderSubject"
		:add-category="addCategory"
		:delete-category="deleteCategory"
		:reorder-category="reorderCategory"
		:update-subject-label="updateSubjectLabel"
		:update-category-label="updateCategoryLabel"
		:remove-set="removeSet"
		@select-subject="handleSelectSubject"
		@select-tree-category="handleSelectTreeCategory"
		@context-action-subject="handleSubjectContextAction"
		@context-action-category="handleCategoryContextAction"
		@paste-subjects="pasteSubjectsFromClipboard"
		@paste-categories="pasteCategoriesFromClipboard"
	/>

	<UAlert
		v-if="syncError"
		class="fixed bottom-4 left-4 right-4 z-50 lg:left-[22rem] lg:right-4"
		color="error"
		variant="solid"
		title="Vorlage konnte nicht synchronisiert werden"
		:description="syncError"
	>
		<template #actions>
			<UButton
				label="Erneut versuchen"
				color="neutral"
				variant="outline"
				:loading="isSyncPending"
				@click="retrySync"
			/>
		</template>
	</UAlert>

	<USlideover
		v-if="isMobile && selectedCategory && selectedCategoryData"
		v-model:open="mobileEditorOpen"
		:title="gradeVariantTitle(selectedCategoryData)"
	>
		<template #body>
			<div class="p-4">
				<GradeVariantEditor
					:category="selectedCategoryData"
					:selected-grade-id="selectedGradeId"
					:selected-variant-id="selectedVariantId"
					:can-edit="canEditTemplates"
					:selected-grade-ids="selectedGradeIdsForEditor"
					:selected-variant-ids="selectedVariantIdsForEditor"
					:selected-sentence-part-ids="selectedSentencePartIdsForEditor"
					:can-paste-grades="canPasteGrades"
					:can-paste-variants="canPasteVariants"
					:can-paste-sentence-parts="canPasteSentenceParts"
					@select-grade="handleSelectGrade"
					@select-variant="handleSelectVariant"
					@select-sentence-part="handleSelectSentencePart"
					@context-open-grade="handleContextOpen('grade', $event)"
					@context-open-variant="handleContextOpen('variant', $event)"
					@context-open-sentence-part="handleContextOpen('sentencePart', sentencePartPathId($event))"
					@context-action-grade="handleGradeContextAction"
					@context-action-variant="handleVariantContextAction"
					@context-action-sentence-part="handleSentencePartContextAction"
					@add-grade="addGradeAndSelect"
					@add-variant="addVariantAndSelect"
					@paste-grades="pasteGradesFromClipboard"
					@paste-variants="pasteVariantsFromClipboard"
					@paste-sentence-parts="pasteSentencePartsFromClipboard"
					@edit-grade-label="handleEditGradeLabel"
					@delete-grade="handleDeleteGrade"
					@edit-variant-label="handleEditVariantLabel"
					@delete-variant="handleDeleteVariant"
					@add-sentence-part="openAddPartModal"
					@add-sentence-part-to-group="openAddPartModal"
					@edit-sentence-part="handleEditSentencePart"
					@delete-sentence-part="handleDeleteSentencePart"
					@reorder-sentence-parts="handleReorderSentenceParts"
					@reorder-optional-group-parts="handleReorderOptionalGroupParts"
					@move-sentence-part-to-group="handleMoveSentencePartToGroup"
					@move-sentence-part-from-group="handleMoveSentencePartFromGroup"
					@move-sentence-part-between-groups="handleMoveSentencePartBetweenGroups"
					@reorder-grades="handleReorderGrades"
					@reorder-variants="handleReorderVariants"
					@toggle-optional-group-default="handleToggleOptionalGroupDefault"
				/>
			</div>
		</template>
	</USlideover>

	<UDashboardPanel v-if="selectedCategory && selectedCategoryData" id="templates-detail" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar :title="gradeVariantTitle(selectedCategoryData)" />
		</template>
		<template #body>
			<div class="flex h-full flex-col gap-3">
				<p class="shrink-0 text-sm text-muted">
					Bearbeite rechts die ausgewählte Kategorie aus der Vorlagenstruktur.
				</p>
				<GradeVariantEditor
					:category="selectedCategoryData"
					:selected-grade-id="selectedGradeId"
					:selected-variant-id="selectedVariantId"
					:can-edit="canEditTemplates"
					:selected-grade-ids="selectedGradeIdsForEditor"
					:selected-variant-ids="selectedVariantIdsForEditor"
					:selected-sentence-part-ids="selectedSentencePartIdsForEditor"
					:can-paste-grades="canPasteGrades"
					:can-paste-variants="canPasteVariants"
					:can-paste-sentence-parts="canPasteSentenceParts"
					@select-grade="handleSelectGrade"
					@select-variant="handleSelectVariant"
					@select-sentence-part="handleSelectSentencePart"
					@context-open-grade="handleContextOpen('grade', $event)"
					@context-open-variant="handleContextOpen('variant', $event)"
					@context-open-sentence-part="handleContextOpen('sentencePart', sentencePartPathId($event))"
					@context-action-grade="handleGradeContextAction"
					@context-action-variant="handleVariantContextAction"
					@context-action-sentence-part="handleSentencePartContextAction"
					@add-grade="addGradeAndSelect"
					@add-variant="addVariantAndSelect"
					@paste-grades="pasteGradesFromClipboard"
					@paste-variants="pasteVariantsFromClipboard"
					@paste-sentence-parts="pasteSentencePartsFromClipboard"
					@edit-grade-label="handleEditGradeLabel"
					@delete-grade="handleDeleteGrade"
					@edit-variant-label="handleEditVariantLabel"
					@delete-variant="handleDeleteVariant"
					@add-sentence-part="openAddPartModal"
					@add-sentence-part-to-group="openAddPartModal"
					@edit-sentence-part="handleEditSentencePart"
					@delete-sentence-part="handleDeleteSentencePart"
					@reorder-sentence-parts="handleReorderSentenceParts"
					@reorder-optional-group-parts="handleReorderOptionalGroupParts"
					@move-sentence-part-to-group="handleMoveSentencePartToGroup"
					@move-sentence-part-from-group="handleMoveSentencePartFromGroup"
					@move-sentence-part-between-groups="handleMoveSentencePartBetweenGroups"
					@reorder-grades="handleReorderGrades"
					@reorder-variants="handleReorderVariants"
					@toggle-optional-group-default="handleToggleOptionalGroupDefault"
				/>
			</div>
		</template>
	</UDashboardPanel>

	<UDashboardPanel v-else id="templates-detail-empty" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar title="Editor" />
		</template>
		<template #body>
			<div class="flex h-full items-center justify-center p-6">
				<div class="max-w-md text-center">
					<p class="text-sm text-muted">
						{{
							hasSubjects
								? 'Lege als Nächstes eine Kategorie an, damit du hier Notenstufen, Varianten und Satzbausteine bearbeiten kannst.'
								: 'Dieser Vorlagensatz ist noch leer. Starte mit einem ersten Fach und einer Kategorie, damit du sofort Inhalte pflegen kannst.'
						}}
					</p>
					<p class="mt-3 text-xs text-muted">
						Struktur: Fach -> Kategorie -> Stufe -> Variante -> Satzbausteine.
					</p>
					<div v-if="canEditTemplates" class="mt-4 flex justify-center">
						<UButton
							v-if="hasSubjects"
							label="Erste Kategorie anlegen"
							icon="i-lucide-folder-plus"
							@click="createFirstCategory"
						/>
						<UButton
							v-else
							label="Mit erstem Fach starten"
							icon="i-lucide-plus"
							@click="createFirstSubjectAndCategory"
						/>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>

	<UModal
		v-model:open="addPartModalOpen"
		title="Satzbaustein hinzufügen"
		description="Wähle den Typ und gib den Inhalt ein."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<UFormField label="Typ" name="add-part-type">
				<UTabs
					:items="addPartTabItems"
					:model-value="addPartType"
					:content="false"
					class="w-full"
					@update:model-value="(value) => (addPartType = value as typeof addPartType)"
				/>
			</UFormField>
			<p class="mt-2 text-sm text-muted">{{ addPartHelp }}</p>
			<template v-if="addPartType === 'text'">
				<UFormField label="Text" name="add-part-text" class="mt-3">
					<UInput v-model="addPartText" placeholder="Text eingeben" autofocus @keydown.enter="confirmAddPart" />
				</UFormField>
			</template>
			<template v-else-if="addPartType === 'genderVariant'">
				<div class="mt-3 flex items-start gap-2">
					<div class="flex-1">
						<UFormField label="Männliche Form" name="add-part-male">
							<UInput v-model="addPartMale" placeholder="z. B. Er" autofocus />
						</UFormField>
						<UFormField label="Weibliche Form" name="add-part-female">
							<UInput v-model="addPartFemale" placeholder="z. B. Sie" @keydown.enter="confirmAddPart" />
						</UFormField>
					</div>
					<div class="flex shrink-0 flex-col gap-1 pt-6">
						<UButton
							v-for="preset in genderVariantPresets"
							:key="preset.label"
							:label="preset.label"
							color="neutral"
							variant="outline"
							size="xs"
							@click="applyGenderVariantPreset(preset)"
						/>
					</div>
				</div>
			</template>
			<template v-else-if="addPartType === 'name'">
				<p class="mt-3 text-sm text-muted">Keine weitere Eingabe nötig.</p>
			</template>
			<template v-else-if="addPartType === 'optionalGroup'">
				<p class="mt-3 text-sm text-muted">
					Die Gruppe startet leer. Füge anschließend Bausteine über das Plus in der Gruppe hinzu.
				</p>
				<UCheckbox
					:model-value="addPartOptionalEnabledByDefault"
					label="Standardmäßig aktiv"
					class="mt-3"
					@update:model-value="addPartOptionalEnabledByDefault = Boolean($event)"
				/>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Hinzufügen" :disabled="!canConfirmAddPart" @click="confirmAddPart" />
		</template>
	</UModal>

	<UModal v-model:open="editPartModalOpen" title="Satzbaustein bearbeiten" :ui="{ footer: 'justify-end' }">
		<template #body>
			<template v-if="editPartType === 'text'">
				<UFormField label="Text" name="edit-part-text">
					<UInput v-model="editPartText" placeholder="Text eingeben" autofocus @keydown.enter="confirmEditPart" />
				</UFormField>
			</template>
			<template v-else-if="editPartType === 'genderVariant'">
				<UFormField label="Männliche Form" name="edit-part-male">
					<UInput v-model="editPartMale" placeholder="z. B. Er" autofocus />
				</UFormField>
				<UFormField label="Weibliche Form" name="edit-part-female">
					<UInput v-model="editPartFemale" placeholder="z. B. Sie" @keydown.enter="confirmEditPart" />
				</UFormField>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Speichern" @click="confirmEditPart" />
		</template>
	</UModal>

	<UModal v-model:open="editLabelModalOpen" :title="editLabelTitle" :ui="{ footer: 'justify-end' }">
		<template #body>
			<UFormField label="Name" name="edit-label">
				<UInput v-model="editLabelValue" autofocus @keydown.enter="confirmEditLabel" />
			</UFormField>
			<template v-if="editLabelSupportsGradeValue">
				<UCheckbox
					:model-value="editLabelGradeValueEnabled"
					label="Eigenen Wert für Durchschnitt verwenden"
					class="mt-4"
					@update:model-value="editLabelGradeValueEnabled = Boolean($event)"
				/>
				<UFormField
					v-if="editLabelGradeValueEnabled"
					label="Wert für Durchschnitt"
					name="edit-grade-value"
					description="Wenn deaktiviert, wird die Notenstufen-Bezeichnung als Zahl verwendet."
					class="mt-3"
				>
					<UInput
						v-model="editLabelGradeValueInput"
						type="number"
						step="0.1"
						placeholder="z. B. 2.5"
						@keydown.enter="confirmEditLabel"
					/>
				</UFormField>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Speichern" :disabled="!canConfirmEditLabel" @click="confirmEditLabel" />
		</template>
	</UModal>

	<UModal
		v-model:open="deleteDialog.open.value"
		:title="deleteDialog.title.value"
		:description="deleteDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="deleteDialog.cancel()" />
			<UButton label="Löschen" color="error" @click="deleteDialog.confirm()" />
		</template>
	</UModal>
</template>
