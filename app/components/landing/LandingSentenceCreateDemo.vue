<script setup lang="ts">
import { landingTemplateSet } from '~/data/landingDemo'
import { useLandingSentenceEditorContext } from '~/composables/useLandingSentenceEditorContext'
import { collectGenderVariantsFromTemplateSet } from '~/utils/collectGenderVariants'

const {
	sentences,
	variant,
	openAddModal,
	openAddModalForGenderVariant,
	openEditModal,
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
} = useLandingSentenceEditorContext()

const genderVariants = computed(() => collectGenderVariantsFromTemplateSet(landingTemplateSet))
</script>

<template>
	<div class="flex flex-col gap-6 lg:grid lg:min-h-[360px] lg:grid-cols-2 lg:items-start">
		<div class="flex min-w-0 flex-col gap-4">
			<p class="text-sm text-muted">
				Bausteine hinzufügen, verschieben und bearbeiten — die Vorschau aktualisiert sich live.
			</p>

			<SentencePartQuickAddBar
				:gender-variants="genderVariants"
				@add-text="openAddModal()"
				@add-name="addQuickNamePart"
				@add-input="addQuickInputPart"
				@add-optional-group="addQuickOptionalGroup"
				@add-gender-variant="applyGenderVariant"
				@create-gender-variant="openAddModalForGenderVariant()"
			/>

			<UCard variant="subtle" class="max-h-[min(70vh,640px)] overflow-y-auto lg:max-h-none lg:overflow-visible">
				<SortablePillList
					:parts="sentences"
					can-edit
					@add="openAddModal()"
					@add-to-group="openAddModal($event)"
					@edit="openEditModal"
					@delete="deletePart"
					@reorder="reorderParts"
					@reorder-group="reorderGroupParts"
					@move-to-group="movePartToGroup"
					@move-from-group="movePartFromGroup"
					@move-between-groups="movePartBetweenGroups"
					@toggle-group-default="toggleGroupDefault"
				/>
			</UCard>
		</div>

		<div class="flex min-w-0 flex-col gap-3 border-t border-default pt-4 lg:border-t-0 lg:pt-0">
			<div class="flex items-center gap-2 text-sm font-medium text-highlighted">
				<UIcon name="i-lucide-eye" class="size-4 text-primary" />
				Live-Vorschau
			</div>
			<VariantSentencePreview
				:variant="variant"
				:can-edit="true"
				@toggle-optional-group-default="toggleGroupDefault"
			/>
		</div>
	</div>
</template>
