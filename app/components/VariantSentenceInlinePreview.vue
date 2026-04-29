<script setup lang="ts">
import type { NamePartReplacementKey } from '~/types/student'
import type { SentencePart, Variant } from '~/types/template'
import { resolveGenderVariantValue, resolveNamePartReplacement } from '~/utils/reportText'

type NameSelectionValue = NamePartReplacementKey | 'name'

const props = withDefaults(
	defineProps<{
		variant: Variant
		previewText: string
		previewName: string
		previewGender: 'male' | 'female'
		namePartSelections?: Record<number, NameSelectionValue>
		optionalPartEnabledMap?: Record<string, boolean>
		showNameReplacementSelect?: boolean
		canEditOptional?: boolean
		textClass?: string
	}>(),
	{
		namePartSelections: () => ({}),
		optionalPartEnabledMap: () => ({}),
		showNameReplacementSelect: true,
		canEditOptional: true,
		textClass: 'text-sm text-default',
	}
)

const emit = defineEmits<{
	toggleOptionalText: [partId: string, enabled: boolean]
	setNamePartSelection: [partIndex: number, value: NameSelectionValue]
}>()

function isOptionalEnabled(part: Extract<SentencePart, { type: 'optionalText' }>): boolean {
	return props.optionalPartEnabledMap[part.id] ?? part.enabledByDefault
}

function partSelection(partIndex: number): NameSelectionValue {
	return props.namePartSelections[partIndex] ?? 'name'
}

function isSentenceStart(partsBefore: string[]): boolean {
	const previousText = partsBefore
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ')
	if (!previousText) return true
	return /[.!?]$/.test(previousText)
}

function resolvedInlinePartsBefore(partIndex: number): string[] {
	const resolvedParts: string[] = []
	for (const [index, part] of props.variant.sentences.entries()) {
		if (index >= partIndex) break
		const text = resolveInlinePart(part, index, resolvedParts).trim()
		if (text) resolvedParts.push(text)
	}
	return resolvedParts
}

function resolveInlinePart(part: SentencePart, partIndex: number, partsBefore: string[] = []): string {
	switch (part.type) {
		case 'text':
			return part.value
		case 'genderVariant':
			return resolveGenderVariantValue(part.value, props.previewGender)
		case 'optionalText':
			return isOptionalEnabled(part) ? part.value : ''
		case 'name': {
			const selection = partSelection(partIndex)
			if (selection !== 'name') {
				return resolveNamePartReplacement(selection, props.previewGender, isSentenceStart(partsBefore))
			}
			return props.previewName.trim()
		}
		default:
			return ''
	}
}

const inlineResolvedText = computed(() => {
	const resolvedParts: string[] = []
	for (const [partIndex, part] of props.variant.sentences.entries()) {
		const text = resolveInlinePart(part, partIndex, resolvedParts).trim()
		if (text) resolvedParts.push(text)
	}
	return resolvedParts.join(' ')
})

const previewSuffix = computed(() => {
	const trimmed = props.previewText.trim()
	if (!trimmed) return ''
	if (/[.!?]$/.test(inlineResolvedText.value.trim())) return ''
	return trimmed.match(/[.!?]$/)?.[0] ?? '.'
})
</script>

<template>
	<div :class="['flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed', textClass]">
		<template
			v-for="(part, partIndex) in variant.sentences"
			:key="`${variant.id}-${partIndex}`"
		>
			<label
				v-if="part.type === 'optionalText'"
				class="inline-flex items-center gap-1.5 rounded border border-default px-1.5 py-0.5 hover:bg-elevated"
			>
				<UCheckbox
					:model-value="isOptionalEnabled(part)"
					:disabled="!canEditOptional"
					:aria-label="`${part.value} ein- oder ausblenden`"
					size="xs"
					@update:model-value="emit('toggleOptionalText', part.id, Boolean($event))"
				/>
				<span
					:class="isOptionalEnabled(part) ? 'text-default' : 'text-muted line-through'"
				>
					{{ part.value }}
				</span>
			</label>
			<USelectMenu
				v-else-if="part.type === 'name' && showNameReplacementSelect"
				:model-value="partSelection(partIndex)"
				:items="[
					{ label: previewName || 'Name', value: 'name' },
					{ label: 'Er/Sie', value: 'erSie' },
				]"
				value-key="value"
				size="xs"
				class="w-auto min-w-20"
				@update:model-value="emit('setNamePartSelection', partIndex, (($event as NameSelectionValue) ?? 'name'))"
			/>
			<span v-else-if="resolveInlinePart(part, partIndex, resolvedInlinePartsBefore(partIndex)).trim()">
				{{ resolveInlinePart(part, partIndex, resolvedInlinePartsBefore(partIndex)).trim() }}
			</span>
		</template>
		<span v-if="previewSuffix" class="-ml-1.5">{{ previewSuffix }}</span>
	</div>
</template>
