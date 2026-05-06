<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		label: string
		active?: boolean
		selected?: boolean
		showDragHandle?: boolean
		dragHandleClass?: string
		canEdit?: boolean
		selectable?: boolean
	}>(),
	{
		active: false,
		selected: false,
		showDragHandle: false,
		dragHandleClass: 'sentence-pill-drag-handle',
		canEdit: false,
		selectable: true,
	}
)
const emit = defineEmits<{
	(e: 'click', event: MouseEvent | KeyboardEvent): void
	(e: 'contextmenu', event: MouseEvent): void
}>()
const slots = useSlots()

const pillClasses = computed(() => [
	'flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm transition-colors',
	props.selected
		? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
		: props.active
		? 'border-primary bg-primary/10 text-primary font-medium'
		: 'border-default bg-elevated text-default',
	props.selectable && (props.selected ? 'cursor-pointer hover:bg-primary/15' : 'cursor-pointer hover:bg-elevated/80'),
])
</script>

<template>
	<button
		type="button"
		:class="pillClasses"
		:title="label || undefined"
		:role="selectable ? 'button' : undefined"
		:tabindex="selectable ? 0 : undefined"
		:aria-pressed="selectable ? active || selected : undefined"
		:aria-selected="selected || undefined"
		@click="selectable ? emit('click', $event) : undefined"
		@contextmenu="emit('contextmenu', $event)"
		@keydown.enter="selectable ? emit('click', $event) : undefined"
		@keydown.space.prevent="selectable ? emit('click', $event) : undefined"
	>
		<span
			v-if="showDragHandle"
			:class="[dragHandleClass, 'cursor-grab active:cursor-grabbing text-muted hover:text-default shrink-0 flex items-center']"
			aria-label="Verschieben"
			@click.stop
		>
			<UIcon class="size-4" name="i-lucide-grip-vertical" />
		</span>

		<span class="min-w-0 max-w-[200px] truncate" :title="label || undefined">
			<slot>{{ label }}</slot>
		</span>

		<div v-if="slots.actions" class="flex items-center">
			<slot name="actions" />
		</div>
	</button>
</template>
