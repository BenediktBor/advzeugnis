<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { Category } from '~/types/template'

const props = withDefaults(
	defineProps<{
		subjectIndex: number
		categories: Category[]
		canEdit?: boolean
		selectedCategoryIndex: number | null
	}>(),
	{ canEdit: false },
)

const emit = defineEmits<{
	reorder: [oldIndex: number, newIndex: number]
	select: [categoryIndex: number]
}>()

const listRef = ref<HTMLElement | null>(null)
const localCategories = ref<Category[]>([])

watch(
	() => props.categories,
	(newVal) => {
		localCategories.value = [...newVal]
	},
	{ immediate: true },
)

useSortable(listRef, localCategories, {
	handle: '.category-drag-handle',
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
</script>

<template>
	<div ref="listRef" class="flex flex-col gap-0.5 pl-4">
		<button
			v-for="(category, categoryIndex) in localCategories"
			:key="category.id"
			type="button"
			class="flex min-h-8 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-elevated/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
			:class="{
				'bg-primary/10 text-primary font-medium':
					selectedCategoryIndex === categoryIndex,
			}"
			@click="emit('select', categoryIndex)"
		>
			<span
				v-if="canEdit"
				class="category-drag-handle cursor-grab active:cursor-grabbing shrink-0 text-muted hover:text-default flex items-center"
				aria-label="Reihenfolge ändern"
				@click.stop
			>
				<UIcon class="size-4" name="i-lucide-grip-vertical" />
			</span>
			<span class="min-w-0 flex-1 truncate">
				{{ category.label || 'Unbenannt' }}
			</span>
			<div v-if="canEdit" class="flex shrink-0 items-center" @click.stop>
				<slot
					name="actions"
					:category="category"
					:category-index="categoryIndex"
				/>
			</div>
		</button>
	</div>
</template>
