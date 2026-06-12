import type { OptionalGroupChildPart, SentencePart, SentencePartPath, Variant } from '~/types/template'
import {
	getSentencePartEditorHelp,
	type SentencePartEditorType,
} from '~/utils/sentencePartEditorHelp'

function cloneSentenceParts(parts: SentencePart[]): SentencePart[] {
	return JSON.parse(JSON.stringify(parts)) as SentencePart[]
}

export function useLocalSentencePartsEditor(initialSentences: SentencePart[]) {
	const sentences = ref<SentencePart[]>(cloneSentenceParts(initialSentences))

	const variant = computed<Variant>(() => ({
		id: 'local-sentence-editor',
		label: 'Demo',
		sentences: sentences.value,
	}))

	const addModalOpen = ref(false)
	const editModalOpen = ref(false)
	const partType = ref<SentencePartEditorType>('text')
	const targetGroupIndex = ref<number | null>(null)
	const editPath = ref<SentencePartPath | null>(null)
	const partText = ref('')
	const partMale = ref('')
	const partFemale = ref('')
	const partInputPlaceholder = ref('')
	const optionalEnabledByDefault = ref(true)

	const addPartTabItems = computed(() => {
		const items: Array<{ value: SentencePartEditorType; label: string }> = [
			{ value: 'text', label: 'Text' },
			{ value: 'genderVariant', label: 'Variabler Text' },
			{ value: 'name', label: 'Name' },
			{ value: 'input', label: 'Eingabe' },
		]
		if (targetGroupIndex.value === null) {
			items.push({ value: 'optionalGroup', label: 'Optionale Gruppe' })
		}
		return items
	})

	const addPartHelp = computed(() => getSentencePartEditorHelp(partType.value))

	const canConfirmPart = computed(() => {
		if (partType.value === 'text') return partText.value.trim() !== ''
		if (partType.value === 'genderVariant') {
			return partMale.value.trim() !== '' && partFemale.value.trim() !== ''
		}
		return true
	})

	function partAtPath(path: SentencePartPath): SentencePart | OptionalGroupChildPart | null {
		const part = sentences.value[path.partIndex]
		if (!part) return null
		if (path.childIndex === undefined) return part
		if (part.type !== 'optionalGroup') return null
		return part.parts[path.childIndex] ?? null
	}

	function resetPartForm() {
		partText.value = ''
		partMale.value = ''
		partFemale.value = ''
		partInputPlaceholder.value = ''
		optionalEnabledByDefault.value = true
	}

	function buildPartFromForm(): SentencePart | OptionalGroupChildPart | null {
		switch (partType.value) {
			case 'text':
				return { type: 'text', value: partText.value.trim() }
			case 'genderVariant':
				return {
					type: 'genderVariant',
					value: [partMale.value.trim(), partFemale.value.trim()],
				}
			case 'name':
				return { type: 'name' }
			case 'input': {
				const placeholder = partInputPlaceholder.value.trim()
				return placeholder ? { type: 'input', placeholder } : { type: 'input' }
			}
			case 'optionalGroup':
				return {
					type: 'optionalGroup',
					id: crypto.randomUUID(),
					enabledByDefault: optionalEnabledByDefault.value,
					parts: [],
				}
			default:
				return null
		}
	}

	function openAddModal(groupIndex: number | null = null) {
		targetGroupIndex.value = groupIndex
		partType.value = 'text'
		resetPartForm()
		addModalOpen.value = true
	}

	function openAddModalForGenderVariant(groupIndex: number | null = null) {
		targetGroupIndex.value = groupIndex
		partType.value = 'genderVariant'
		resetPartForm()
		addModalOpen.value = true
	}

	function confirmAddPart() {
		const part = buildPartFromForm()
		if (!part) return
		const next = cloneSentenceParts(sentences.value)
		if (targetGroupIndex.value !== null) {
			const group = next[targetGroupIndex.value]
			if (!group || group.type !== 'optionalGroup' || part.type === 'optionalGroup') return
			group.parts = [...group.parts, part]
		} else {
			next.push(part as SentencePart)
		}
		sentences.value = next
		addModalOpen.value = false
	}

	function openEditModal(path: SentencePartPath) {
		const part = partAtPath(path)
		if (!part || (part.type !== 'text' && part.type !== 'genderVariant' && part.type !== 'input')) return
		editPath.value = path
		partType.value = part.type
		if (part.type === 'text') {
			partText.value = part.value
			partMale.value = ''
			partFemale.value = ''
			partInputPlaceholder.value = ''
		} else if (part.type === 'genderVariant') {
			partText.value = ''
			partMale.value = part.value[0] ?? ''
			partFemale.value = part.value[1] ?? ''
			partInputPlaceholder.value = ''
		} else {
			partText.value = ''
			partMale.value = ''
			partFemale.value = ''
			partInputPlaceholder.value = part.placeholder ?? ''
		}
		editModalOpen.value = true
	}

	function confirmEditPart() {
		const path = editPath.value
		if (!path || !canConfirmPart.value) return
		const next = cloneSentenceParts(sentences.value)
		const container = next[path.partIndex]
		const part =
			path.childIndex === undefined
				? container
				: container?.type === 'optionalGroup'
					? container.parts[path.childIndex]
					: null
		if (!part) return
		if (partType.value === 'text' && part.type === 'text') {
			part.value = partText.value.trim()
		} else if (partType.value === 'genderVariant' && part.type === 'genderVariant') {
			part.value = [partMale.value.trim(), partFemale.value.trim()]
		} else if (partType.value === 'input' && part.type === 'input') {
			const placeholder = partInputPlaceholder.value.trim()
			if (placeholder) {
				part.placeholder = placeholder
			} else {
				delete part.placeholder
			}
		} else {
			return
		}
		sentences.value = next
		editModalOpen.value = false
		editPath.value = null
	}

	function deletePart(path: SentencePartPath) {
		const next = cloneSentenceParts(sentences.value)
		if (path.childIndex === undefined) {
			next.splice(path.partIndex, 1)
		} else {
			const group = next[path.partIndex]
			if (group?.type !== 'optionalGroup') return
			group.parts = group.parts.filter((_, i) => i !== path.childIndex)
		}
		sentences.value = next
	}

	function reorderParts(oldIndex: number, newIndex: number) {
		const next = cloneSentenceParts(sentences.value)
		const [moved] = next.splice(oldIndex, 1)
		if (!moved) return
		next.splice(newIndex, 0, moved)
		sentences.value = next
	}

	function reorderGroupParts(groupIndex: number, oldIndex: number, newIndex: number) {
		const next = cloneSentenceParts(sentences.value)
		const group = next[groupIndex]
		if (group?.type !== 'optionalGroup') return
		const [moved] = group.parts.splice(oldIndex, 1)
		if (!moved) return
		group.parts.splice(newIndex, 0, moved)
		sentences.value = next
	}

	function movePartToGroup(fromIndex: number, groupIndex: number, childIndex?: number) {
		if (fromIndex === groupIndex) return
		const next = cloneSentenceParts(sentences.value)
		const part = next[fromIndex]
		if (!part || part.type === 'optionalGroup') return
		const group = next[groupIndex]
		if (group?.type !== 'optionalGroup') return
		const [removed] = next.splice(fromIndex, 1)
		if (!removed || removed.type === 'optionalGroup') return
		const index = childIndex === undefined
			? group.parts.length
			: Math.max(0, Math.min(childIndex, group.parts.length))
		group.parts.splice(index, 0, removed)
		sentences.value = next
	}

	function movePartFromGroup(groupIndex: number, childIndex: number, toIndex?: number) {
		const next = cloneSentenceParts(sentences.value)
		const group = next[groupIndex]
		if (group?.type !== 'optionalGroup') return
		const [removed] = group.parts.splice(childIndex, 1)
		if (!removed) return
		const index = toIndex === undefined
			? next.length
			: Math.max(0, Math.min(toIndex, next.length))
		next.splice(index, 0, removed)
		sentences.value = next
	}

	function movePartBetweenGroups(
		fromGroupIndex: number,
		childIndex: number,
		toGroupIndex: number,
		toChildIndex?: number,
	) {
		const next = cloneSentenceParts(sentences.value)
		const fromGroup = next[fromGroupIndex]
		const toGroup = next[toGroupIndex]
		if (fromGroup?.type !== 'optionalGroup' || toGroup?.type !== 'optionalGroup') return
		const [removed] = fromGroup.parts.splice(childIndex, 1)
		if (!removed) return
		const insertionLimit = fromGroup === toGroup ? fromGroup.parts.length : toGroup.parts.length
		const index = toChildIndex === undefined
			? insertionLimit
			: Math.max(0, Math.min(toChildIndex, insertionLimit))
		toGroup.parts.splice(index, 0, removed)
		sentences.value = next
	}

	function toggleGroupDefault(partIndex: number, enabledByDefault: boolean) {
		const next = cloneSentenceParts(sentences.value)
		const group = next[partIndex]
		if (group?.type !== 'optionalGroup') return
		group.enabledByDefault = enabledByDefault
		sentences.value = next
	}

	function addQuickNamePart() {
		sentences.value = [...cloneSentenceParts(sentences.value), { type: 'name' }]
	}

	function addQuickInputPart() {
		sentences.value = [...cloneSentenceParts(sentences.value), { type: 'input' }]
	}

	function addQuickOptionalGroup() {
		sentences.value = [
			...cloneSentenceParts(sentences.value),
			{
				type: 'optionalGroup',
				id: crypto.randomUUID(),
				enabledByDefault: true,
				parts: [],
			},
		]
	}

	function applyGenderVariant(value: [string, string]) {
		sentences.value = [
			...cloneSentenceParts(sentences.value),
			{
				type: 'genderVariant',
				value,
			},
		]
	}

	return {
		sentences,
		variant,
		addModalOpen,
		editModalOpen,
		partType,
		partText,
		partMale,
		partFemale,
		partInputPlaceholder,
		optionalEnabledByDefault,
		addPartTabItems,
		addPartHelp,
		canConfirmPart,
		openAddModal,
		openAddModalForGenderVariant,
		confirmAddPart,
		openEditModal,
		confirmEditPart,
		deletePart,
		reorderParts,
		reorderGroupParts,
		movePartToGroup,
		movePartFromGroup,
		movePartBetweenGroups,
		toggleGroupDefault,
		addQuickNamePart,
		addQuickInputPart,
		addQuickOptionalGroup,
		applyGenderVariant,
	}
}

export type LocalSentencePartsEditor = ReturnType<typeof useLocalSentencePartsEditor>
