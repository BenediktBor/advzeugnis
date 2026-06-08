<script setup lang="ts">
import { landingSentenceCreateDemoSentences } from '~/data/landingDemo'
import { useLocalSentencePartsEditor } from '~/composables/useLocalSentencePartsEditor'

const {
	sentences,
	variant,
	addModalOpen,
	editModalOpen,
	partType,
	partText,
	partMale,
	partFemale,
	optionalEnabledByDefault,
	addPartTabItems,
	canConfirmPart,
	openAddModal,
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
	addQuickOptionalGroup,
	applyGenderPreset,
} = useLocalSentencePartsEditor(landingSentenceCreateDemoSentences)
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-2 min-h-[360px]">
		<div class="flex flex-col gap-4">
			<p class="text-sm text-muted">
				Bausteine hinzufügen, verschieben und bearbeiten — die Vorschau aktualisiert sich live.
			</p>

			<SentencePartQuickAddBar
				@add-text="openAddModal()"
				@add-name="addQuickNamePart"
				@add-gender-preset="applyGenderPreset"
				@add-optional-group="addQuickOptionalGroup"
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

		<UModal
			v-model:open="addModalOpen"
			title="Satzbaustein hinzufügen"
			description="Wähle den Typ und fülle die Felder aus."
			:ui="{ footer: 'justify-end gap-2' }"
		>
			<template #body>
				<SentencePartEditorFields
					v-model:part-type="partType"
					v-model:part-text="partText"
					v-model:part-male="partMale"
					v-model:part-female="partFemale"
					v-model:optional-enabled-by-default="optionalEnabledByDefault"
					:add-part-tab-items="addPartTabItems"
				/>
			</template>
			<template #footer>
				<UButton label="Abbrechen" color="neutral" variant="ghost" @click="addModalOpen = false" />
				<UButton label="Hinzufügen" :disabled="!canConfirmPart" @click="confirmAddPart" />
			</template>
		</UModal>

		<UModal
			v-model:open="editModalOpen"
			title="Satzbaustein bearbeiten"
			:ui="{ footer: 'justify-end gap-2' }"
		>
			<template #body>
				<SentencePartEditorFields
					v-model:part-type="partType"
					v-model:part-text="partText"
					v-model:part-male="partMale"
					v-model:part-female="partFemale"
					v-model:optional-enabled-by-default="optionalEnabledByDefault"
					:add-part-tab-items="addPartTabItems"
					:show-type-tabs="false"
				/>
			</template>
			<template #footer>
				<UButton label="Abbrechen" color="neutral" variant="ghost" @click="editModalOpen = false" />
				<UButton label="Speichern" :disabled="!canConfirmPart" @click="confirmEditPart" />
			</template>
		</UModal>
	</div>
</template>
