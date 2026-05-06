<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'

export interface SortablePillItem {
	id: string
	label: string
}

type PillContextMenuAction = 'copy' | 'cut' | 'paste'

const props = withDefaults(
	defineProps<{
		items: SortablePillItem[]
		activeId: string | null
		selectedIds?: string[]
		canEdit?: boolean
		canPaste?: boolean
	}>(),
	{ selectedIds: () => [], canEdit: false, canPaste: false },
)

const emit = defineEmits<{
	select: [id: string, event: MouseEvent | KeyboardEvent]
	reorder: [oldIndex: number, newIndex: number]
	contextOpen: [id: string]
	contextAction: [action: PillContextMenuAction, id: string]
}>()

const listRef = ref<HTMLElement | null>(null)
const localList = ref<SortablePillItem[]>([])

watch(
	() => props.items,
	(newVal) => {
		localList.value = [...newVal]
	},
	{ immediate: true },
)

useSortable(listRef, localList, {
	handle: '.sentence-pill-drag-handle',
	animation: 150,
	onEnd: (evt: { oldIndex: number | undefined; newIndex: number | undefined }) => {
		const oldIndex = evt.oldIndex
		const newIndex = evt.newIndex
		if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
		emit('reorder', oldIndex, newIndex)
	},
})

function contextMenuItems(item: SortablePillItem) {
	return [
		[
			{
				label: 'Kopieren',
				icon: 'i-lucide-copy',
				onSelect: () => emit('contextAction', 'copy', item.id),
			},
			{
				label: 'Ausschneiden',
				icon: 'i-lucide-scissors',
				disabled: !props.canEdit,
				onSelect: () => emit('contextAction', 'cut', item.id),
			},
			{
				label: 'Einfügen',
				icon: 'i-lucide-clipboard-paste',
				disabled: !props.canEdit || !props.canPaste,
				onSelect: () => emit('contextAction', 'paste', item.id),
			},
		],
	]
}
</script>

<template>
	<div ref="listRef" class="flex flex-wrap items-center gap-2">
		<UContextMenu
			v-for="item in localList"
			:key="item.id"
			:items="contextMenuItems(item)"
		>
			<TemplatePill
				:label="item.label"
				:show-drag-handle="canEdit"
				:can-edit="canEdit"
				:active="activeId === item.id"
				:selected="selectedIds.includes(item.id)"
				selectable
				@click="emit('select', item.id, $event)"
				@contextmenu="emit('contextOpen', item.id)"
			>
				<template v-if="canEdit" #actions>
					<slot name="actions" :item="item" />
				</template>
			</TemplatePill>
		</UContextMenu>
	</div>
</template>
