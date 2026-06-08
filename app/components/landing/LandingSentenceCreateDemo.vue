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
	addQuickOptionalGroup,
	applyGenderVariant,
} = useLandingSentenceEditorContext()

const genderVariants = computed(() => collectGenderVariantsFromTemplateSet(landingTemplateSet))
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-2 min-h-[360px]">
		<div class="flex flex-col gap-4">
			<p class="text-sm text-muted">
				Bausteine hinzufügen, verschieben und bearbeiten — die Vorschau aktualisiert sich live.
			</p>

			<SentencePartQuickAddBar
				:gender-variants="genderVariants"
				@add-text="openAddModal()"
				@add-name="addQuickNamePart"
				@add-optional-group="addQuickOptionalGroup"
				@add-gender-variant="applyGenderVariant"
				@create-gender-variant="openAddModalForGenderVariant()"
			/>

			<UCard variant="subtle">
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

		<div class="flex flex-col gap-3">
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
