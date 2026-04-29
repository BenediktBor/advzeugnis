<script setup lang="ts">
import type { NamePartOverrides } from '~/types/student'
import type { NamePartReplacementKey } from '~/types/student'
import type { SentencePart, Variant } from '~/types/template'
import {
	buildVariantPreviewText,
	namePartOverrideKey,
	resolveGenderVariantValue,
	resolveNamePartReplacement,
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

function partSummary(part: SentencePart): string {
	if (part.type === 'name') return 'Name-Baustein'
	if (part.type === 'optionalText') return part.value || 'Optionaler Text'
	if (part.type === 'genderVariant') return `${part.value[0] ?? ''} / ${part.value[1] ?? ''}`
	return part.value || 'Text'
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

function resolvedInlinePartsBefore(partIndex: number): string[] {
	const resolvedParts: string[] = []
	for (const [index, part] of props.variant.sentences.entries()) {
		if (index >= partIndex) break
		const text = resolveInlineTemplatePart(part, index, resolvedParts).trim()
		if (text) resolvedParts.push(text)
	}
	return resolvedParts
}

function isNextInlinePartSentenceStart(partsBefore: string[]): boolean {
	const previousText = partsBefore
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ')
	if (!previousText) return true
	return /[.!?]$/.test(previousText)
}

function resolveInlineTemplatePart(
	part: SentencePart,
	partIndex: number,
	partsBefore: string[] = []
): string {
	switch (part.type) {
		case 'text':
			return part.value
		case 'genderVariant':
			return resolveGenderVariantValue(part.value, previewGender.value)
		case 'optionalText':
			return part.enabledByDefault ? part.value : ''
		case 'name': {
			const selection = nameSelectionValue(partIndex)
			if (selection !== 'name') {
				return resolveNamePartReplacement(
					selection,
					previewGender.value,
					isNextInlinePartSentenceStart(partsBefore)
				)
			}
			return previewName.value.trim() || defaultNameByGender[previewGender.value]
		}
		default:
			return ''
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

const previewSuffix = computed(() => {
	const trimmed = previewText.value.trim()
	if (!trimmed) return ''
	return trimmed.match(/[.!?]$/)?.[0] ?? '.'
})
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
			<div
				v-if="previewText"
				class="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed"
			>
				<template
					v-for="(part, partIndex) in variant.sentences"
					:key="`${variant.id}-${partIndex}`"
				>
					<label
						v-if="part.type === 'optionalText'"
						class="inline-flex items-center gap-1.5 rounded border border-default px-1.5 py-0.5 hover:bg-elevated"
					>
						<UCheckbox
							:model-value="part.enabledByDefault"
							:disabled="!canEdit"
							:aria-label="`${partSummary(part)} ein- oder ausblenden`"
							size="xs"
							@update:model-value="
								emit('toggleOptionalTextDefault', partIndex, Boolean($event))
							"
						/>
						<span
							:class="part.enabledByDefault ? 'text-default' : 'text-muted line-through'"
						>
							{{ part.value }}
						</span>
					</label>
					<USelectMenu
						v-else-if="part.type === 'name'"
						:model-value="nameSelectionValue(partIndex)"
						:items="[
							{ label: previewName || defaultNameByGender[previewGender], value: 'name' },
							{ label: 'Er/Sie', value: 'erSie' },
						]"
						value-key="value"
						size="xs"
						class="w-auto min-w-20"
						@update:model-value="
							setNameSelection(partIndex, (($event as NamePreviewMode) ?? 'name'))
						"
					/>
					<span v-else-if="resolveInlineTemplatePart(part, partIndex, resolvedInlinePartsBefore(partIndex)).trim()">
						{{ resolveInlineTemplatePart(part, partIndex, resolvedInlinePartsBefore(partIndex)).trim() }}
					</span>
				</template>
				<span v-if="previewSuffix" class="-ml-1.5">{{ previewSuffix }}</span>
			</div>
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
