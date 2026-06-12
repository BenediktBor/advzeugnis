<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { landingSentenceCreateDemoSentences } from '~/data/landingDemo'
import { landingAnchorIds, landingDemoTabs } from '~/data/landingContent'
import { useLocalSentencePartsEditor } from '~/composables/useLocalSentencePartsEditor'
import { provideLandingSentenceEditor } from '~/composables/useLandingSentenceEditorContext'

const demoTab = ref('report')
const showTabBadges = useMediaQuery('(min-width: 640px)')

const demoTabs = computed(() =>
	landingDemoTabs.map((tab) => ({
		...tab,
		badge: showTabBadges.value ? tab.badge : undefined,
	})),
)

const sentenceEditor = useLocalSentencePartsEditor(landingSentenceCreateDemoSentences)
provideLandingSentenceEditor(sentenceEditor)

const {
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
	confirmAddPart,
	confirmEditPart,
} = sentenceEditor
</script>

<template>
	<UPageSection
		:id="landingAnchorIds.demo"
		headline="Live-Demo"
		title="Probiere es aus"
		description="Kein Login nötig — wähle Noten und Formulierungen und sieh den Zeugnistext live entstehen."
	>
		<UCard variant="subtle" class="min-w-0 overflow-hidden">
			<UTabs
				v-model="demoTab"
				:items="demoTabs"
				class="w-full"
				:ui="{
					list: 'border-b border-default overflow-x-auto px-2 pt-2 sm:px-4',
					trigger: 'text-xs whitespace-nowrap sm:text-sm',
					content: 'min-w-0 p-4 sm:p-6',
				}"
			>
				<template #report>
					<LandingReportDemo />
				</template>
				<template #sentences>
					<LandingSentenceCreateDemo />
				</template>
			</UTabs>
		</UCard>

		<UModal
			v-model:open="addModalOpen"
			title="Satzbaustein hinzufügen"
			description="Wähle den Typ und gib den Inhalt ein."
			:ui="{ footer: 'justify-end gap-2' }"
		>
			<template #body>
				<SentencePartAddModalBody
					key="landing-add-part"
					v-model:part-type="partType"
					v-model:part-text="partText"
					v-model:part-male="partMale"
					v-model:part-female="partFemale"
					v-model:part-input-placeholder="partInputPlaceholder"
					v-model:optional-enabled-by-default="optionalEnabledByDefault"
					:add-part-tab-items="addPartTabItems"
					:add-part-help="addPartHelp"
					@submit="confirmAddPart"
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
				<SentencePartAddModalBody
					key="landing-edit-part"
					v-model:part-type="partType"
					v-model:part-text="partText"
					v-model:part-male="partMale"
					v-model:part-female="partFemale"
					v-model:part-input-placeholder="partInputPlaceholder"
					v-model:optional-enabled-by-default="optionalEnabledByDefault"
					:add-part-tab-items="addPartTabItems"
					:add-part-help="addPartHelp"
					:show-type-tabs="false"
					:show-gender-presets="false"
					:autofocus="false"
					@submit="confirmEditPart"
				/>
			</template>
			<template #footer>
				<UButton label="Abbrechen" color="neutral" variant="ghost" @click="editModalOpen = false" />
				<UButton label="Speichern" :disabled="!canConfirmPart" @click="confirmEditPart" />
			</template>
		</UModal>
	</UPageSection>
</template>
