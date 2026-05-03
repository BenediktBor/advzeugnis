<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'

export interface SortablePillItem {
	id: string
	label: string
}

const props = withDefaults(
	defineProps<{
		items: SortablePillItem[]
		activeId: string | null
		canEdit?: boolean
	}>(),
	{ canEdit: false },
)

const emit = defineEmits<{
	select: [id: string]
	reorder: [oldIndex: number, newIndex: number]
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
</script>

<template>
	<div ref="listRef" class="flex flex-wrap items-center gap-2">
		<TemplatePill
			v-for="item in localList"
			:key="item.id"
			:label="item.label"
			:show-drag-handle="canEdit"
			:can-edit="canEdit"
			:active="activeId === item.id"
			selectable
			@click="emit('select', item.id)"
		>
			<template v-if="canEdit" #actions>
				<slot name="actions" :item="item" />
			</template>
		</TemplatePill>
	</div>
</template>
