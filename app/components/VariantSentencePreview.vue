<script setup lang="ts">
import type { NamePartOverrides } from '~/types/student'
import type { NamePartReplacementKey } from '~/types/student'
import type { Variant } from '~/types/template'
import {
	buildVariantPreviewText,
	namePartOverrideKey,
} from '~/utils/reportText'

type NamePreviewMode = 'name' | NamePartReplacementKey

const props = withDefaults(
	defineProps<{
		variant: Variant
		canEdit?: boolean
	}>(),
	{
		canEdit: false,
	}
)

const emit = defineEmits<{
	toggleOptionalTextDefault: [partIndex: number, enabledByDefault: boolean]
}>()

const defaultNameByGender: Record<'male' | 'female', string> = {
	male: 'Max',
	female: 'Mia',
}

const previewGender = ref<'male' | 'female'>('male')
const previewName = ref(defaultNameByGender[previewGender.value])
const previewUseCustomName = ref(false)
const previewGenderItems = [
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]
const previewSettingsOpen = ref(false)

const previewNameSelection = ref<Record<number, NamePreviewMode>>({})

watch(
	() => props.variant.id,
	() => {
		previewNameSelection.value = {}
	}
)

watch(previewGender, (nextGender, previousGender) => {
	const previousDefault = defaultNameByGender[previousGender]
	const shouldUseDefault = !previewUseCustomName.value || !previewName.value.trim() || previewName.value === previousDefault
	if (shouldUseDefault) {
		previewName.value = defaultNameByGender[nextGender]
	}
})

function onToggleCustomName(value: boolean) {
	previewUseCustomName.value = value
	if (!previewUseCustomName.value) {
		previewName.value = defaultNameByGender[previewGender.value]
	}
}

function nameSelectionValue(partIndex: number): NamePreviewMode {
	return previewNameSelection.value[partIndex] ?? 'name'
}

function setNameSelection(partIndex: number, value: NamePreviewMode) {
	previewNameSelection.value = {
		...previewNameSelection.value,
		[partIndex]: value,
	}
}

const namePartOverrides = computed<NamePartOverrides>(() => {
	const overrides: NamePartOverrides = {}
	for (const [partIndex, selection] of Object.entries(previewNameSelection.value)) {
		if (selection === 'name') continue
		overrides[namePartOverrideKey(props.variant.id, Number(partIndex))] = selection
	}
	return overrides
})

const previewText = computed(() =>
	buildVariantPreviewText(
		{
			name: previewName.value.trim() || defaultNameByGender[previewGender.value],
			gender: previewGender.value,
		},
		props.variant,
		{},
		namePartOverrides.value
	)
)

const namePartSelections = computed<Record<number, NamePreviewMode>>(() =>
	Object.fromEntries(
		props.variant.sentences
			.map((part, partIndex) => [part, partIndex] as const)
			.filter(([part]) => part.type === 'name')
			.map(([, partIndex]) => [partIndex, nameSelectionValue(partIndex)])
	)
)

const optionalPartEnabledMap = computed<Record<string, boolean>>(() =>
	Object.fromEntries(
		props.variant.sentences
			.filter((part): part is Extract<(typeof props.variant.sentences)[number], { type: 'optionalText' }> => part.type === 'optionalText')
			.map((part) => [part.id, part.enabledByDefault])
	)
)

function toggleOptionalTextById(partId: string, enabled: boolean) {
	const partIndex = props.variant.sentences.findIndex(
		(part) => part.type === 'optionalText' && part.id === partId
	)
	if (partIndex === -1) return
	emit('toggleOptionalTextDefault', partIndex, enabled)
}
</script>

<template>
	<div class="rounded-md border border-default bg-elevated/40 p-3">
		<div class="flex items-center justify-between gap-2">
			<div class="text-xs font-medium text-muted">Vorschau</div>
			<UButton
				icon="i-lucide-cog"
				size="xs"
				color="neutral"
				variant="ghost"
				aria-label="Vorschau-Einstellungen öffnen"
				@click="previewSettingsOpen = true"
			/>
		</div>

		<div class="mt-3 rounded border border-default bg-default px-3 py-2 text-sm text-default">
			<VariantSentenceInlinePreview
				v-if="previewText"
				:variant="variant"
				:preview-text="previewText"
				:preview-name="previewName || defaultNameByGender[previewGender]"
				:preview-gender="previewGender"
				:name-part-selections="namePartSelections"
				:optional-part-enabled-map="optionalPartEnabledMap"
				:can-edit-optional="canEdit"
				@toggle-optional-text="toggleOptionalTextById"
				@set-name-part-selection="
					(partIndex, value) => setNameSelection(partIndex, value)
				"
			/>
			<p v-else class="text-muted">Kein Vorschautext vorhanden.</p>
		</div>

		<UModal
			v-model:open="previewSettingsOpen"
			title="Vorschau-Einstellungen"
			description="Passe Name und Geschlecht für die Satzvorschau an."
			:ui="{ footer: 'justify-end' }"
		>
			<template #body>
				<div class="grid gap-3">
					<UFormField label="Geschlecht" name="preview-gender">
						<USelectMenu
							:model-value="previewGender"
							:items="previewGenderItems"
							value-key="value"
							@update:model-value="previewGender = (($event as 'male' | 'female') ?? 'male')"
						/>
					</UFormField>
					<UCheckbox
						:model-value="previewUseCustomName"
						label="Eigenen Namen verwenden?"
						@update:model-value="onToggleCustomName(Boolean($event))"
					/>
					<UFormField v-if="previewUseCustomName" label="Name" name="preview-name">
						<UInput v-model="previewName" placeholder="z. B. Max" />
					</UFormField>
				</div>
			</template>
			<template #footer="{ close }">
				<UButton label="Schließen" color="neutral" variant="outline" @click="close()" />
			</template>
		</UModal>
	</div>
</template>
