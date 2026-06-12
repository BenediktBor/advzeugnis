<script setup lang="ts">
import type { NamePartReplacementKey } from '~/types/student'
import type { OptionalGroupChildPart, SentencePart, Variant } from '~/types/template'
import { resolveGenderVariantValue, resolveNamePartReplacement } from '~/utils/reportText'

type NameSelectionValue = NamePartReplacementKey | 'name'
type InlinePart = SentencePart | OptionalGroupChildPart

const props = withDefaults(
	defineProps<{
		variant: Variant
		previewText: string
		previewName: string
		previewGender: 'male' | 'female'
		namePartSelections?: Record<string, NameSelectionValue>
		inputPartValues?: Record<string, string>
		selectPartValues?: Record<string, string>
		optionalPartEnabledMap?: Record<string, boolean>
		showNameReplacementSelect?: boolean
		canEditOptional?: boolean
		textClass?: string
	}>(),
	{
		namePartSelections: () => ({}),
		inputPartValues: () => ({}),
		selectPartValues: () => ({}),
		optionalPartEnabledMap: () => ({}),
		showNameReplacementSelect: true,
		canEditOptional: true,
		textClass: 'text-sm text-default',
	}
)

const emit = defineEmits<{
	toggleOptionalGroup: [partId: string, enabled: boolean]
	setNamePartSelection: [partPath: string, value: NameSelectionValue]
	setInputPartValue: [partPath: string, value: string]
	setSelectPartValue: [partPath: string, value: string]
}>()

function isOptionalEnabled(part: Extract<SentencePart, { type: 'optionalGroup' }>): boolean {
	return props.optionalPartEnabledMap[part.id] ?? part.enabledByDefault
}

function isOptionalGroup(part: SentencePart): part is Extract<SentencePart, { type: 'optionalGroup' }> {
	return part.type === 'optionalGroup'
}

function optionalGroupId(part: SentencePart): string {
	return isOptionalGroup(part) ? part.id : ''
}

function optionalGroupParts(part: SentencePart): OptionalGroupChildPart[] {
	return isOptionalGroup(part) ? part.parts : []
}

function optionalGroupEnabled(part: SentencePart): boolean {
	return isOptionalGroup(part) && isOptionalEnabled(part)
}

function partSelection(partPath: string): NameSelectionValue {
	return props.namePartSelections[partPath] ?? 'name'
}

function inputPartValue(partPath: string): string {
	return props.inputPartValues[partPath] ?? ''
}

function inputPlaceholder(part: Extract<InlinePart, { type: 'input' }>): string {
	return part.placeholder?.trim() || 'Eingabe…'
}

function selectPartValue(partPath: string): string {
	return props.selectPartValues[partPath] ?? ''
}

function selectMenuItems(part: Extract<InlinePart, { type: 'select' }>) {
	return part.options.map((option) => ({ label: option, value: option }))
}

function selectPlaceholder(part: Extract<InlinePart, { type: 'select' }>): string {
	return part.placeholder?.trim() || 'Auswahl…'
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
		const text = resolveInlinePart(part, String(index), resolvedParts).trim()
		if (text) resolvedParts.push(text)
	}
	return resolvedParts
}

function groupChildResolvedPartsBefore(groupIndex: number, childIndex: number): string[] {
	const group = props.variant.sentences[groupIndex]
	const resolvedParts = resolvedInlinePartsBefore(groupIndex)
	if (group?.type !== 'optionalGroup') return resolvedParts
	for (const [index, part] of group.parts.entries()) {
		if (index >= childIndex) break
		const text = resolveInlinePart(part, `${groupIndex}.${index}`, resolvedParts).trim()
		if (text) resolvedParts.push(text)
	}
	return resolvedParts
}

function resolveInlinePart(part: InlinePart, partPath: string, partsBefore: string[] = []): string {
	switch (part.type) {
		case 'text':
			return part.value
		case 'genderVariant':
			return resolveGenderVariantValue(part.value, props.previewGender)
		case 'optionalGroup': {
			if (!isOptionalEnabled(part)) return ''
			const resolvedParts = [...partsBefore]
			const groupParts: string[] = []
			for (const [childIndex, childPart] of part.parts.entries()) {
				const text = resolveInlinePart(childPart, `${partPath}.${childIndex}`, resolvedParts).trim()
				if (!text) continue
				groupParts.push(text)
				resolvedParts.push(text)
			}
			return groupParts.join(' ')
		}
		case 'name': {
			const selection = partSelection(partPath)
			if (selection !== 'name') {
				return resolveNamePartReplacement(selection, props.previewGender, isSentenceStart(partsBefore))
			}
			return props.previewName.trim()
		}
		case 'input':
			return inputPartValue(partPath).trim()
		case 'select':
			return selectPartValue(partPath).trim()
		default:
			return ''
	}
}

const inlineResolvedText = computed(() => {
	const resolvedParts: string[] = []
	for (const [partIndex, part] of props.variant.sentences.entries()) {
		const text = resolveInlinePart(part, String(partIndex), resolvedParts).trim()
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
	<div :class="['inline leading-relaxed break-words', textClass]">
		<template
			v-for="(part, partIndex) in variant.sentences"
			:key="`${variant.id}-${partIndex}`"
		>
			<USelectMenu
				v-if="part.type === 'select'"
				:model-value="selectPartValue(String(partIndex)) || undefined"
				:items="selectMenuItems(part)"
				:placeholder="selectPlaceholder(part)"
				value-key="value"
				size="xs"
				class="mr-1.5 inline-block w-auto min-w-24 align-baseline"
				@click.stop
				@keydown.stop
				@update:model-value="emit('setSelectPartValue', String(partIndex), String($event ?? ''))"
			/>
			<UInput
				v-else-if="part.type === 'input'"
				:model-value="inputPartValue(String(partIndex))"
				:placeholder="inputPlaceholder(part)"
				size="xs"
				class="mr-1.5 inline-block w-auto min-w-24 align-baseline"
				@click.stop
				@keydown.stop
				@update:model-value="emit('setInputPartValue', String(partIndex), String($event ?? ''))"
			/>
			<USelectMenu
				v-else-if="part.type === 'name' && showNameReplacementSelect"
				:model-value="partSelection(String(partIndex))"
				:items="[
					{ label: previewName || 'Name', value: 'name' },
					{ label: 'Er/Sie', value: 'erSie' },
				]"
				value-key="value"
				size="xs"
				class="mr-1.5 inline-block w-auto min-w-20 align-baseline"
				@click.stop
				@keydown.stop
				@update:model-value="emit('setNamePartSelection', String(partIndex), (($event as NameSelectionValue) ?? 'name'))"
			/>
			<label
				v-else-if="isOptionalGroup(part)"
				class="mr-1.5 inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1 align-baseline rounded border border-default px-1.5 py-0.5 hover:bg-elevated"
				@click.stop
				@keydown.enter.stop
				@keydown.space.stop
			>
				<UCheckbox
					:model-value="optionalGroupEnabled(part)"
					:disabled="!canEditOptional"
					aria-label="Optionale Gruppe ein- oder ausblenden"
					size="xs"
					@update:model-value="emit('toggleOptionalGroup', optionalGroupId(part), Boolean($event))"
				/>
				<span
					:class="[
						'inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1',
						optionalGroupEnabled(part) ? 'text-default' : 'text-muted line-through',
					]"
				>
					<template
						v-for="(childPart, childIndex) in optionalGroupParts(part)"
						:key="`${variant.id}-${partIndex}-${childIndex}`"
					>
						<USelectMenu
							v-if="childPart.type === 'select' && optionalGroupEnabled(part)"
							:model-value="selectPartValue(`${partIndex}.${childIndex}`) || undefined"
							:items="selectMenuItems(childPart)"
							:placeholder="selectPlaceholder(childPart)"
							value-key="value"
							size="xs"
							class="inline-block w-auto min-w-24 align-baseline"
							@click.stop
							@keydown.stop
							@update:model-value="emit('setSelectPartValue', `${partIndex}.${childIndex}`, String($event ?? ''))"
						/>
						<UInput
							v-else-if="childPart.type === 'input' && optionalGroupEnabled(part)"
							:model-value="inputPartValue(`${partIndex}.${childIndex}`)"
							:placeholder="inputPlaceholder(childPart)"
							size="xs"
							class="inline-block w-auto min-w-24 align-baseline"
							@click.stop
							@keydown.stop
							@update:model-value="emit('setInputPartValue', `${partIndex}.${childIndex}`, String($event ?? ''))"
						/>
						<USelectMenu
							v-else-if="childPart.type === 'name' && showNameReplacementSelect && optionalGroupEnabled(part)"
							:model-value="partSelection(`${partIndex}.${childIndex}`)"
							:items="[
								{ label: previewName || 'Name', value: 'name' },
								{ label: 'Er/Sie', value: 'erSie' },
							]"
							value-key="value"
							size="xs"
							class="inline-block w-auto min-w-20 align-baseline"
							@click.stop
							@keydown.stop
							@update:model-value="emit('setNamePartSelection', `${partIndex}.${childIndex}`, (($event as NameSelectionValue) ?? 'name'))"
						/>
						<span
							v-else-if="resolveInlinePart(childPart, `${partIndex}.${childIndex}`, groupChildResolvedPartsBefore(partIndex, childIndex)).trim()"
							class="inline align-baseline"
						>
							{{ resolveInlinePart(childPart, `${partIndex}.${childIndex}`, groupChildResolvedPartsBefore(partIndex, childIndex)).trim() }}
						</span>
					</template>
					<span v-if="optionalGroupParts(part).length === 0" class="text-muted">(leer)</span>
				</span>
			</label>
			<span
				v-else-if="resolveInlinePart(part, String(partIndex), resolvedInlinePartsBefore(partIndex)).trim()"
				class="mr-1.5 inline align-baseline"
			>
				{{ resolveInlinePart(part, String(partIndex), resolvedInlinePartsBefore(partIndex)).trim() }}
			</span>
		</template>
		<span v-if="previewSuffix" class="-ml-1.5">{{ previewSuffix }}</span>
	</div>
</template>
