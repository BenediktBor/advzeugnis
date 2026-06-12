<script setup lang="ts">
import { genderVariantPresets } from '~/constants/templateEditor'
import type { SentencePartEditorType } from '~/utils/sentencePartEditorHelp'

const partType = defineModel<SentencePartEditorType>('partType', { required: true })
const partText = defineModel<string>('partText', { required: true })
const partMale = defineModel<string>('partMale', { required: true })
const partFemale = defineModel<string>('partFemale', { required: true })
const partInputPlaceholder = defineModel<string>('partInputPlaceholder', { required: true })
const partSelectOptions = defineModel<string>('partSelectOptions', { required: true })
const partSelectPlaceholder = defineModel<string>('partSelectPlaceholder', { required: true })
const optionalEnabledByDefault = defineModel<boolean>('optionalEnabledByDefault', { required: true })

const props = withDefaults(
	defineProps<{
		addPartTabItems: Array<{ value: SentencePartEditorType; label: string }>
		addPartHelp: string
		showTypeTabs?: boolean
		showGenderPresets?: boolean
		autofocus?: boolean
		genderPresetMode?: 'fill' | 'insert'
	}>(),
	{
		showTypeTabs: true,
		genderPresetMode: 'fill',
	},
)

const emit = defineEmits<{
	submit: []
	applyGenderPreset: [value: [string, string]]
}>()

function selectPartType(value: string | number) {
	partType.value = value as SentencePartEditorType
}

function onGenderPresetClick(male: string, female: string) {
	if (props.genderPresetMode === 'insert') {
		emit('applyGenderPreset', [male, female])
		return
	}
	partMale.value = male
	partFemale.value = female
}
</script>

<template>
	<div class="space-y-4">
		<div v-if="props.showTypeTabs" class="space-y-2">
			<UFormField label="Typ" name="sentence-part-type">
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					<UButton
						v-for="item in props.addPartTabItems"
						:key="item.value"
						:label="item.label"
						size="sm"
						block
						:variant="partType === item.value ? 'solid' : 'outline'"
						:color="partType === item.value ? 'primary' : 'neutral'"
						@click="selectPartType(item.value)"
					/>
				</div>
			</UFormField>
			<p class="min-h-10 text-sm text-muted">{{ props.addPartHelp }}</p>
		</div>

		<div class="min-h-56">
		<template v-if="partType === 'text'">
			<UFormField label="Text" name="sentence-part-text">
				<SentencePartTextInput
					v-model="partText"
					placeholder="Text eingeben"
					:autofocus="props.autofocus !== false"
					@submit="emit('submit')"
				/>
			</UFormField>
		</template>

		<template v-else-if="partType === 'genderVariant'">
			<div class="flex items-start gap-2">
				<div class="flex-1">
					<UFormField label="Männliche Form" name="sentence-part-male">
						<SentencePartTextInput
							v-model="partMale"
							placeholder="z. B. Er"
							:autofocus="props.autofocus !== false"
							:submit-on-enter="false"
						/>
					</UFormField>
					<UFormField label="Weibliche Form" name="sentence-part-female">
						<SentencePartTextInput
							v-model="partFemale"
							placeholder="z. B. Sie"
							@submit="emit('submit')"
						/>
					</UFormField>
				</div>
				<div
					v-if="props.showGenderPresets !== false"
					class="flex shrink-0 flex-col gap-1 pt-6"
				>
					<UButton
						v-for="preset in genderVariantPresets"
						:key="preset.label"
						:label="preset.label"
						color="neutral"
						variant="outline"
						size="xs"
						@click="onGenderPresetClick(preset.male, preset.female)"
					/>
				</div>
			</div>
		</template>

		<template v-else-if="partType === 'name'">
			<p class="text-sm text-muted">Keine weitere Eingabe nötig.</p>
		</template>

		<template v-else-if="partType === 'input'">
			<UFormField label="Platzhalter (optional)" name="sentence-part-input-placeholder">
				<UInput
					v-model="partInputPlaceholder"
					placeholder="z. B. Projektname"
					:autofocus="props.autofocus !== false"
					@keydown.enter="emit('submit')"
				/>
			</UFormField>
		</template>

		<template v-else-if="partType === 'select'">
			<UFormField
				label="Auswahloptionen"
				name="sentence-part-select-options"
				description="Eine Option pro Zeile"
			>
				<UTextarea
					v-model="partSelectOptions"
					placeholder="z. B. gut&#10;sehr gut&#10;ausgezeichnet"
					:rows="4"
					:autofocus="props.autofocus !== false"
				/>
			</UFormField>
			<UFormField label="Platzhalter (optional)" name="sentence-part-select-placeholder" class="mt-3">
				<UInput
					v-model="partSelectPlaceholder"
					placeholder="z. B. Leistung wählen"
					@keydown.enter="emit('submit')"
				/>
			</UFormField>
		</template>

		<template v-else-if="partType === 'optionalGroup'">
			<p class="text-sm text-muted">
				Die Gruppe startet leer. Füge anschließend Bausteine über das Plus in der Gruppe hinzu.
			</p>
			<UCheckbox
				v-model="optionalEnabledByDefault"
				label="Standardmäßig aktiv"
				class="mt-3"
			/>
		</template>
		</div>
	</div>
</template>
