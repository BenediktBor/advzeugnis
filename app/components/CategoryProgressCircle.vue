<script setup lang="ts">
const props = defineProps<{
	value: number
	total: number
	label: string
	displayValue?: string
	belowLabel?: string
	tone?: 'primary' | 'success' | 'neutral'
}>()

const radius = 18
const circumference = 2 * Math.PI * radius
const progress = computed(() => {
	if (props.total <= 0) return 0
	return Math.min(1, Math.max(0, props.value / props.total))
})
const strokeOffset = computed(() => circumference * (1 - progress.value))
const strokeToneClass = computed(() => {
	if (props.tone === 'success') return 'text-success'
	if (props.tone === 'neutral') return 'text-muted'
	return 'text-primary'
})
</script>

<template>
	<div
		class="inline-flex flex-col items-center gap-1"
		role="progressbar"
		:aria-label="label"
		:aria-valuemin="0"
		:aria-valuemax="total"
		:aria-valuenow="value"
	>
		<div class="relative size-11" aria-hidden="true">
			<svg class="size-11 -rotate-90" viewBox="0 0 44 44">
				<circle
					class="stroke-current text-muted/25"
					cx="22"
					cy="22"
					:r="radius"
					fill="none"
					stroke-width="4"
				/>
				<circle
					class="stroke-current transition-all duration-300"
					:class="strokeToneClass"
					cx="22"
					cy="22"
					:r="radius"
					fill="none"
					stroke-linecap="round"
					stroke-width="4"
					:stroke-dasharray="circumference"
					:stroke-dashoffset="strokeOffset"
				/>
			</svg>
			<span class="absolute inset-0 flex items-center justify-center text-xs font-medium text-default">
				{{ displayValue ?? `${value}/${total}` }}
			</span>
		</div>
		<span
			v-if="belowLabel"
			class="max-w-16 truncate text-center text-[11px] leading-tight text-muted"
			:title="belowLabel"
		>
			{{ belowLabel }}
		</span>
		<span class="sr-only">{{ label }}</span>
	</div>
</template>
