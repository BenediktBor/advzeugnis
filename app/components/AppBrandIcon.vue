<script setup lang="ts">
withDefaults(
	defineProps<{
		class?: string
	}>(),
	{
		class: 'size-5',
	},
)
</script>

<template>
	<UIcon
		name="i-lucide-graduation-cap"
		:class="['text-primary shrink-0', $props.class]"
	/>
</template>
