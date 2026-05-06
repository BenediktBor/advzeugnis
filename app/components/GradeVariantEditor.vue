<script setup lang="ts">
import type { Category, OptionalGroupChildPart, SentencePart, SentencePartPath, Variant } from '~/types/template'

const props = defineProps<{
	category: Category
	selectedGradeId: string | null
	selectedVariantId: string | null
	canEdit: boolean
	selectedGradeIds: string[]
	selectedVariantIds: string[]
	selectedSentencePartIds: string[]
	canPasteGrades: boolean
	canPasteVariants: boolean
	canPasteSentenceParts: boolean
}>()

const emit = defineEmits<{
	selectGrade: [gradeId: string, event: MouseEvent | KeyboardEvent]
	selectVariant: [variantId: string, event: MouseEvent | KeyboardEvent]
	selectSentencePart: [path: SentencePartPath, event: MouseEvent | KeyboardEvent]
	contextOpenGrade: [gradeId: string]
	contextOpenVariant: [variantId: string]
	contextOpenSentencePart: [path: SentencePartPath]
	contextActionGrade: [action: 'copy' | 'cut' | 'paste', gradeId: string]
	contextActionVariant: [action: 'copy' | 'cut' | 'paste', variantId: string]
	contextActionSentencePart: [action: 'copy' | 'cut' | 'paste', path: SentencePartPath]
	addGrade: []
	addVariant: []
	pasteGrades: []
	pasteVariants: []
	pasteSentenceParts: []
	reorderGrades: [oldIndex: number, newIndex: number]
	reorderVariants: [oldIndex: number, newIndex: number]
	editGradeLabel: [gradeId: string, currentLabel: string, currentValue: number | undefined]
	deleteGrade: [gradeId: string, label: string]
	editVariantLabel: [variantId: string, currentLabel: string]
	deleteVariant: [variantId: string, label: string]
	addSentencePart: []
	addSentencePartToGroup: [groupIndex: number]
	editSentencePart: [part: SentencePart | OptionalGroupChildPart, path: SentencePartPath]
	deleteSentencePart: [path: SentencePartPath]
	reorderSentenceParts: [oldIndex: number, newIndex: number]
	reorderOptionalGroupParts: [groupIndex: number, oldIndex: number, newIndex: number]
	moveSentencePartToGroup: [fromIndex: number, groupIndex: number, childIndex?: number]
	moveSentencePartFromGroup: [groupIndex: number, childIndex: number, toIndex?: number]
	moveSentencePartBetweenGroups: [fromGroupIndex: number, childIndex: number, toGroupIndex: number, toChildIndex?: number]
	toggleOptionalGroupDefault: [partIndex: number, enabledByDefault: boolean]
}>()

const selectedGradeData = computed(() => {
	if (!props.selectedGradeId) return null
	return props.category.grades.find((g) => g.id === props.selectedGradeId) ?? null
})

const selectedGradeVariants = computed(() => selectedGradeData.value?.variants ?? [])

const selectedVariantData = computed<Variant | null>(() => {
	if (!selectedGradeData.value || !props.selectedVariantId) return null
	return selectedGradeData.value.variants.find((v) => v.id === props.selectedVariantId) ?? null
})

const sentencePartsList = ref<SentencePart[]>([])
watch(
	() => selectedVariantData.value?.sentences ?? [],
	(sentences) => { sentencePartsList.value = [...sentences] },
	{ immediate: true }
)

function sentencePartLabel(part: SentencePart | OptionalGroupChildPart): string {
	switch (part.type) {
		case 'text': return part.value || '(leer)'
		case 'genderVariant': return `${part.value[0] ?? ''}/${part.value[1] ?? ''}`
		case 'name': return 'Name'
		case 'optionalGroup':
			return `Optionale Gruppe (${part.enabledByDefault ? 'aktiv' : 'inaktiv'})`
		default: return ''
	}
}

function onSentencePartsReorder(oldIndex: number, newIndex: number) {
	emit('reorderSentenceParts', oldIndex, newIndex)
	nextTick(() => {
		if (selectedVariantData.value) {
			sentencePartsList.value = [...selectedVariantData.value.sentences]
		}
	})
}

function sentencePartAtPath(path: SentencePartPath): SentencePart | OptionalGroupChildPart | null {
	const part = selectedVariantData.value?.sentences[path.partIndex]
	if (!part) return null
	if (path.childIndex === undefined) return part
	if (part.type !== 'optionalGroup') return null
	return part.parts[path.childIndex] ?? null
}
</script>

<template>
	<div class="flex flex-1 flex-col gap-4 overflow-auto">
		<section>
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-sm font-medium text-default">Notenstufen</h3>
				<div v-if="canEdit" class="flex flex-wrap justify-end gap-2">
					<UButton
						label="Aus Zwischenablage"
						icon="i-lucide-clipboard-paste"
						size="sm"
						variant="soft"
						:disabled="!canPasteGrades"
						@click="emit('pasteGrades')"
					/>
					<UButton
						label="Notenstufe hinzufügen"
						icon="i-lucide-plus"
						size="sm"
						@click="emit('addGrade')"
					/>
				</div>
			</div>
			<SortableSelectablePills
				class="mt-2"
				:items="category.grades"
				:active-id="selectedGradeId"
				:can-edit="canEdit"
				:selected-ids="selectedGradeIds"
				:can-paste="canPasteGrades"
				@select="
					(gradeId, event) =>
						emit('selectGrade', gradeId, event)
				"
				@context-open="emit('contextOpenGrade', $event)"
				@context-action="
					(action, gradeId) =>
						emit('contextActionGrade', action, gradeId)
				"
				@reorder="
					(oldIndex, newIndex) =>
						emit('reorderGrades', oldIndex, newIndex)
				"
			>
				<template #actions="{ item }">
					<UButton
						icon="i-lucide-pencil"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Notenstufe umbenennen"
						@click.stop="
							emit(
								'editGradeLabel',
								item.id,
								item.label,
								category.grades.find((g) => g.id === item.id)?.value
							)
						"
					/>
					<UButton
						icon="i-lucide-trash-2"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Notenstufe löschen"
						@click.stop="emit('deleteGrade', item.id, item.label)"
					/>
				</template>
			</SortableSelectablePills>
			<p v-if="category.grades.length === 0" class="mt-2 text-sm text-muted">
				Noch keine Notenstufen vorhanden. Lege eine erste Notenstufe an.
			</p>
		</section>

		<section v-if="selectedGradeData">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-sm font-medium text-default">
					Varianten (Notenstufe {{ selectedGradeData.label }})
				</h3>
				<div v-if="canEdit" class="flex flex-wrap justify-end gap-2">
					<UButton
						label="Aus Zwischenablage"
						icon="i-lucide-clipboard-paste"
						size="sm"
						variant="soft"
						:disabled="!canPasteVariants"
						@click="emit('pasteVariants')"
					/>
					<UButton
						label="Variante hinzufügen"
						icon="i-lucide-plus"
						size="sm"
						@click="emit('addVariant')"
					/>
				</div>
			</div>
			<SortableSelectablePills
				class="mt-2"
				:items="selectedGradeVariants"
				:active-id="selectedVariantId"
				:can-edit="canEdit"
				:selected-ids="selectedVariantIds"
				:can-paste="canPasteVariants"
				@select="
					(variantId, event) =>
						emit('selectVariant', variantId, event)
				"
				@context-open="emit('contextOpenVariant', $event)"
				@context-action="
					(action, variantId) =>
						emit('contextActionVariant', action, variantId)
				"
				@reorder="
					(oldIndex, newIndex) =>
						emit('reorderVariants', oldIndex, newIndex)
				"
			>
				<template #actions="{ item }">
					<UButton
						icon="i-lucide-pencil"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Variante umbenennen"
						@click.stop="
							emit(
								'editVariantLabel',
								item.id,
								item.label
							)
						"
					/>
					<UButton
						icon="i-lucide-trash-2"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Variante löschen"
						@click.stop="
							emit('deleteVariant', item.id, item.label)
						"
					/>
				</template>
			</SortableSelectablePills>
			<p v-if="selectedGradeVariants.length === 0" class="mt-2 text-sm text-muted">
				Diese Notenstufe enthält noch keine Varianten.
			</p>
		</section>

		<section v-if="selectedVariantData" class="mt-4">
			<h3 class="text-sm font-medium text-default mb-2">
				Satzbausteine (Variante {{ selectedVariantData.label }})
			</h3>
			<SortablePillList
				:parts="sentencePartsList"
				:can-edit="canEdit"
				:selected-ids="selectedSentencePartIds"
				:can-paste="canPasteSentenceParts"
				@reorder="onSentencePartsReorder"
				@reorder-group="
					(groupIndex, oldIndex, newIndex) =>
						emit('reorderOptionalGroupParts', groupIndex, oldIndex, newIndex)
				"
				@move-to-group="
					(fromIndex, groupIndex, childIndex) =>
						emit('moveSentencePartToGroup', fromIndex, groupIndex, childIndex)
				"
				@move-from-group="
					(groupIndex, childIndex, toIndex) =>
						emit('moveSentencePartFromGroup', groupIndex, childIndex, toIndex)
				"
				@move-between-groups="
					(fromGroupIndex, childIndex, toGroupIndex, toChildIndex) =>
						emit('moveSentencePartBetweenGroups', fromGroupIndex, childIndex, toGroupIndex, toChildIndex)
				"
				@add="emit('addSentencePart')"
				@add-to-group="emit('addSentencePartToGroup', $event)"
				@paste-from-clipboard="emit('pasteSentenceParts')"
				@toggle-group-default="
					(partIndex, enabledByDefault) =>
						emit('toggleOptionalGroupDefault', partIndex, enabledByDefault)
				"
				@select="
					(path, event) =>
						emit('selectSentencePart', path, event)
				"
				@context-open="emit('contextOpenSentencePart', $event)"
				@context-action="
					(action, path) =>
						emit('contextActionSentencePart', action, path)
				"
				@edit="
					(path) => {
						const part = sentencePartAtPath(path)
						if (part) emit('editSentencePart', part, path)
					}
				"
				@delete="emit('deleteSentencePart', $event)"
			>
				<template #label="{ part }">
					{{ sentencePartLabel(part) }}
				</template>
				<template #actions="{ part, partIndex }">
					<UButton
						v-if="part.type === 'text' || part.type === 'genderVariant'"
						icon="i-lucide-pencil"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Baustein bearbeiten"
						@click="emit('editSentencePart', part, { partIndex })"
					/>
					<UButton
						icon="i-lucide-trash-2"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Baustein löschen"
						@click="emit('deleteSentencePart', { partIndex })"
					/>
				</template>
			</SortablePillList>
			<p v-if="selectedVariantData.sentences.length === 0" class="mt-2 text-sm text-muted">
				Noch keine Satzbausteine. Füge den ersten Baustein hinzu.
			</p>
			<VariantSentencePreview
				class="mt-3"
				:variant="selectedVariantData"
				:can-edit="canEdit"
				@toggle-optional-group-default="
					(partIndex, enabledByDefault) =>
						emit('toggleOptionalGroupDefault', partIndex, enabledByDefault)
				"
			/>
		</section>
	</div>
</template>
