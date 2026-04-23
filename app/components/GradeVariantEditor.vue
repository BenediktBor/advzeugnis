<script setup lang="ts">
import type { Category, SentencePart, Variant } from '~/types/template'

const props = defineProps<{
	category: Category
	selectedGradeId: string | null
	selectedVariantId: string | null
	canEdit: boolean
}>()

const emit = defineEmits<{
	selectGrade: [gradeId: string]
	selectVariant: [variantId: string]
	addGrade: []
	addVariant: []
	editGradeLabel: [gradeId: string, currentLabel: string]
	deleteGrade: [gradeId: string, label: string]
	editVariantLabel: [variantId: string, currentLabel: string]
	deleteVariant: [variantId: string, label: string]
	addSentencePart: []
	editSentencePart: [part: SentencePart, partIndex: number]
	deleteSentencePart: [partIndex: number]
	reorderSentenceParts: [oldIndex: number, newIndex: number]
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

function sentencePartLabel(part: SentencePart): string {
	switch (part.type) {
		case 'text': return part.value || '(leer)'
		case 'genderVariant': return `${part.value[0] ?? ''}/${part.value[1] ?? ''}`
		case 'name': return 'Name'
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
</script>

<template>
	<div class="flex flex-1 flex-col gap-4 overflow-auto">
		<section>
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-sm font-medium text-default">Notenstufen</h3>
				<UButton
					v-if="canEdit"
					label="Notenstufe hinzufügen"
					icon="i-lucide-plus"
					size="sm"
					@click="emit('addGrade')"
				/>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<TemplatePill
					v-for="grade in category.grades"
					:key="grade.id"
					:label="grade.label"
					:active="selectedGradeId === grade.id"
					:can-edit="canEdit"
					selectable
					@click="emit('selectGrade', grade.id)"
				>
					<template v-if="canEdit" #actions>
						<UButton
							icon="i-lucide-pencil"
							color="neutral"
							variant="ghost"
							size="xs"
							aria-label="Notenstufe umbenennen"
							@click.stop="emit('editGradeLabel', grade.id, grade.label)"
						/>
						<UButton
							icon="i-lucide-trash-2"
							color="neutral"
							variant="ghost"
							size="xs"
							aria-label="Notenstufe löschen"
							@click.stop="emit('deleteGrade', grade.id, grade.label)"
						/>
					</template>
				</TemplatePill>
			</div>
		</section>

		<section v-if="selectedGradeData">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-sm font-medium text-default">
					Varianten (Notenstufe {{ selectedGradeData.label }})
				</h3>
				<UButton
					v-if="canEdit"
					label="Variante hinzufügen"
					icon="i-lucide-plus"
					size="sm"
					@click="emit('addVariant')"
				/>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<TemplatePill
					v-for="variant in selectedGradeVariants"
					:key="variant.id"
					:label="variant.label"
					:active="selectedVariantId === variant.id"
					:can-edit="canEdit"
					selectable
					@click="emit('selectVariant', variant.id)"
				>
					<template v-if="canEdit" #actions>
						<UButton
							icon="i-lucide-pencil"
							color="neutral"
							variant="ghost"
							size="xs"
							aria-label="Variante umbenennen"
							@click.stop="emit('editVariantLabel', variant.id, variant.label)"
						/>
						<UButton
							icon="i-lucide-trash-2"
							color="neutral"
							variant="ghost"
							size="xs"
							aria-label="Variante löschen"
							@click.stop="emit('deleteVariant', variant.id, variant.label)"
						/>
					</template>
				</TemplatePill>
			</div>
		</section>

		<section v-if="selectedVariantData" class="mt-4">
			<h3 class="text-sm font-medium text-default mb-2">
				Satzbausteine (Variante {{ selectedVariantData.label }})
			</h3>
			<SortablePillList
				:parts="sentencePartsList"
				:can-edit="canEdit"
				@reorder="onSentencePartsReorder"
				@add="emit('addSentencePart')"
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
						@click="emit('editSentencePart', part, partIndex)"
					/>
					<UButton
						icon="i-lucide-trash-2"
						color="neutral"
						variant="ghost"
						size="xs"
						aria-label="Baustein löschen"
						@click="emit('deleteSentencePart', partIndex)"
					/>
				</template>
			</SortablePillList>
		</section>
	</div>
</template>
