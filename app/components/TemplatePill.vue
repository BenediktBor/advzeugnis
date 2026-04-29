<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		label: string
		active?: boolean
		showDragHandle?: boolean
		canEdit?: boolean
		selectable?: boolean
	}>(),
	{
		active: false,
		showDragHandle: false,
		canEdit: false,
		selectable: true,
	}
)
const emit = defineEmits<{
	(e: 'click', event: MouseEvent | KeyboardEvent): void
}>()
const slots = useSlots()

const pillClasses = computed(() => [
	'flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm transition-colors',
	props.active
		? 'border-primary bg-primary/10 text-primary font-medium'
		: 'border-default bg-elevated text-default',
	props.selectable && 'cursor-pointer hover:bg-elevated/80',
])
</script>

<template>
	<button
		type="button"
		:class="pillClasses"
		:title="label || undefined"
		:role="selectable ? 'button' : undefined"
		:tabindex="selectable ? 0 : undefined"
		:aria-pressed="selectable ? active : undefined"
		@click="selectable ? emit('click', $event) : undefined"
		@keydown.enter="selectable ? emit('click', $event) : undefined"
		@keydown.space.prevent="selectable ? emit('click', $event) : undefined"
	>
		<span
			v-if="showDragHandle"
			class="sentence-pill-drag-handle cursor-grab active:cursor-grabbing text-muted hover:text-default shrink-0 flex items-center"
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
