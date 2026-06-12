<script setup lang="ts">
import type { InputPartOverrides, NamePartOverrides, SelectPartOverrides } from '~/types/student'
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
	toggleOptionalGroupDefault: [partIndex: number, enabledByDefault: boolean]
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

const previewNameSelection = ref<Record<string, NamePreviewMode>>({})
const previewInputValues = ref<Record<string, string>>({})
const previewSelectValues = ref<Record<string, string>>({})

watch(
	() => props.variant.id,
	() => {
		previewNameSelection.value = {}
		previewInputValues.value = {}
		previewSelectValues.value = {}
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

function nameSelectionValue(partPath: string): NamePreviewMode {
	return previewNameSelection.value[partPath] ?? 'name'
}

function setNameSelection(partPath: string, value: NamePreviewMode) {
	previewNameSelection.value = {
		...previewNameSelection.value,
		[partPath]: value,
	}
}

function setInputValue(partPath: string, value: string) {
	previewInputValues.value = {
		...previewInputValues.value,
		[partPath]: value,
	}
}

function setSelectValue(partPath: string, value: string) {
	previewSelectValues.value = {
		...previewSelectValues.value,
		[partPath]: value,
	}
}

const namePartOverrides = computed<NamePartOverrides>(() => {
	const overrides: NamePartOverrides = {}
	for (const [partPath, selection] of Object.entries(previewNameSelection.value)) {
		if (selection === 'name') continue
		overrides[namePartOverrideKey(props.variant.id, partPath)] = selection
	}
	return overrides
})

const inputPartOverrides = computed<InputPartOverrides>(() => {
	const overrides: InputPartOverrides = {}
	for (const [partPath, value] of Object.entries(previewInputValues.value)) {
		const trimmed = value.trim()
		if (!trimmed) continue
		overrides[namePartOverrideKey(props.variant.id, partPath)] = trimmed
	}
	return overrides
})

const selectPartOverrides = computed<SelectPartOverrides>(() => {
	const overrides: SelectPartOverrides = {}
	for (const [partPath, value] of Object.entries(previewSelectValues.value)) {
		const trimmed = value.trim()
		if (!trimmed) continue
		overrides[namePartOverrideKey(props.variant.id, partPath)] = trimmed
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
		namePartOverrides.value,
		inputPartOverrides.value,
		selectPartOverrides.value
	)
)

const namePartSelections = computed<Record<string, NamePreviewMode>>(() => {
	const selections: Record<string, NamePreviewMode> = {}
	for (const [partIndex, part] of props.variant.sentences.entries()) {
		if (part.type === 'name') {
			selections[String(partIndex)] = nameSelectionValue(String(partIndex))
		}
		if (part.type === 'optionalGroup') {
			for (const [childIndex, childPart] of part.parts.entries()) {
				if (childPart.type === 'name') {
					const partPath = `${partIndex}.${childIndex}`
					selections[partPath] = nameSelectionValue(partPath)
				}
			}
		}
	}
	return selections
})

const optionalPartEnabledMap = computed<Record<string, boolean>>(() =>
	Object.fromEntries(
		props.variant.sentences
			.filter((part): part is Extract<(typeof props.variant.sentences)[number], { type: 'optionalGroup' }> => part.type === 'optionalGroup')
			.map((part) => [part.id, part.enabledByDefault])
	)
)

function toggleOptionalGroupById(partId: string, enabled: boolean) {
	const partIndex = props.variant.sentences.findIndex(
		(part) => part.type === 'optionalGroup' && part.id === partId
	)
	if (partIndex === -1) return
	emit('toggleOptionalGroupDefault', partIndex, enabled)
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

		<div class="mt-2 text-sm text-default">
			<VariantSentenceInlinePreview
				v-if="previewText"
				:variant="variant"
				:preview-text="previewText"
				:preview-name="previewName || defaultNameByGender[previewGender]"
				:preview-gender="previewGender"
				:name-part-selections="namePartSelections"
				:input-part-values="previewInputValues"
				:select-part-values="previewSelectValues"
				:optional-part-enabled-map="optionalPartEnabledMap"
				:can-edit-optional="canEdit"
				@toggle-optional-group="toggleOptionalGroupById"
				@set-name-part-selection="
					(partIndex, value) => setNameSelection(partIndex, value)
				"
				@set-input-part-value="setInputValue"
				@set-select-part-value="setSelectValue"
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
