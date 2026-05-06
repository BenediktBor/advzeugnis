<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { SentencePart } from '~/types/template'

type PillContextMenuAction = 'copy' | 'cut' | 'paste'

const props = withDefaults(
	defineProps<{
		parts: SentencePart[]
		canEdit?: boolean
		selectedIndexes?: number[]
		canPaste?: boolean
	}>(),
	{ canEdit: false, selectedIndexes: () => [], canPaste: false },
)

const emit = defineEmits<{
	reorder: [oldIndex: number, newIndex: number]
	add: []
	pasteFromClipboard: []
	select: [partIndex: number, event: MouseEvent | KeyboardEvent]
	contextOpen: [partIndex: number]
	contextAction: [action: PillContextMenuAction, partIndex: number]
}>()

const listRef = ref<HTMLElement | null>(null)
const localList = ref<SentencePart[]>([])
const partKeyMap = new WeakMap<SentencePart, string>()
let partKeyCounter = 0

function partKey(part: SentencePart): string {
	const existing = partKeyMap.get(part)
	if (existing) return existing
	partKeyCounter += 1
	const key = `sentence-part-${partKeyCounter}`
	partKeyMap.set(part, key)
	return key
}

function defaultPartLabel(part: SentencePart): string {
	if (part.type === 'text') return part.value || '(leer)'
	if (part.type === 'genderVariant') return `${part.value[0] ?? ''}/${part.value[1] ?? ''}`
	if (part.type === 'optionalText') {
		return `Optional (${part.enabledByDefault ? 'aktiv' : 'inaktiv'}): ${part.value || '(leer)'}`
	}
	return 'Name'
}

watch(
	() => props.parts,
	(newVal) => {
		localList.value = [...newVal]
	},
	{ immediate: true },
)

useSortable(listRef, localList, {
	handle: '.sentence-pill-drag-handle',
	animation: 150,
	onEnd: (evt: {
		oldIndex: number | undefined
		newIndex: number | undefined
	}) => {
		const oldIndex = evt.oldIndex
		const newIndex = evt.newIndex
		if (
			oldIndex === undefined ||
			newIndex === undefined ||
			oldIndex === newIndex
		)
			return
		emit('reorder', oldIndex, newIndex)
	},
})

function contextMenuItems(partIndex: number) {
	return [
		[
			{
				label: 'Kopieren',
				icon: 'i-lucide-copy',
				onSelect: () => emit('contextAction', 'copy', partIndex),
			},
			{
				label: 'Ausschneiden',
				icon: 'i-lucide-scissors',
				disabled: !props.canEdit,
				onSelect: () => emit('contextAction', 'cut', partIndex),
			},
			{
				label: 'Einfügen',
				icon: 'i-lucide-clipboard-paste',
				disabled: !props.canEdit || !props.canPaste,
				onSelect: () => emit('contextAction', 'paste', partIndex),
			},
		],
	]
}
</script>

<template>
	<div class="flex flex-wrap items-center gap-2">
		<div ref="listRef" class="flex flex-wrap items-center gap-2">
			<template v-for="(part, partIndex) in localList" :key="partKey(part)">
				<UContextMenu
					:items="contextMenuItems(partIndex)"
				>
					<TemplatePill
						:label="defaultPartLabel(part)"
						:show-drag-handle="canEdit"
						:can-edit="canEdit"
						:selected="selectedIndexes.includes(partIndex)"
						selectable
						@click="emit('select', partIndex, $event)"
						@contextmenu="emit('contextOpen', partIndex)"
					>
						<slot name="label" :part="part" :part-index="partIndex">
							{{
								defaultPartLabel(part)
							}}
						</slot>
						<template v-if="canEdit" #actions>
							<slot
								name="actions"
								:part="part"
								:part-index="partIndex"
							/>
						</template>
					</TemplatePill>
				</UContextMenu>
			</template>
		</div>
		<UButton
			v-if="canEdit"
			icon="i-lucide-plus"
			class="rounded-full"
			variant="soft"
			aria-label="Baustein hinzufügen"
			@click="emit('add')"
		/>
		<UButton
			v-if="canEdit"
			label="Aus Zwischenablage"
			icon="i-lucide-clipboard-paste"
			size="sm"
			variant="soft"
			:disabled="!canPaste"
			@click="emit('pasteFromClipboard')"
		/>
	</div>
</template>
