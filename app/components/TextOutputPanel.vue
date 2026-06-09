<script setup lang="ts">
import type { ReportSegment } from '~/utils/reportText'

const props = withDefaults(
	defineProps<{
		segments: ReportSegment[]
		focusedCategoryId: string | null
		highlightedVariantId: string | null
		label?: string
		labelIcon?: string
	}>(),
	{ label: 'Textausgabe' },
)

const outputRef = ref<HTMLElement | null>(null)

function scrollToActiveSegment() {
	if (!import.meta.client || !outputRef.value) return

	const selector = props.highlightedVariantId
		? `[data-variant-id="${props.highlightedVariantId}"]`
		: props.focusedCategoryId
			? `[data-category-id="${props.focusedCategoryId}"]`
			: null

	if (!selector) return

	outputRef.value
		.querySelector<HTMLElement>(selector)
		?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

watch(
	() => [props.highlightedVariantId, props.focusedCategoryId, props.segments.length],
	async () => {
		await nextTick()
		scrollToActiveSegment()
	},
)
</script>

<template>
	<div class="flex min-h-0 flex-1 flex-col gap-2">
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2 text-sm font-medium text-highlighted">
				<UIcon v-if="labelIcon" :name="labelIcon" class="size-4 text-primary" />
				<span>{{ label }}</span>
			</div>
			<slot name="actions" />
		</div>
		<div
			ref="outputRef"
			id="text-output"
			class="min-h-[200px] w-full flex-1 overflow-auto rounded-md border border-default bg-default px-3 py-2 text-sm leading-relaxed text-default focus:outline-none focus:ring-2 focus:ring-primary"
			role="region"
			tabindex="0"
			:aria-label="label"
		>
			<template v-if="segments.length">
				<template v-for="(seg, idx) in segments" :key="`${seg.categoryId}:${seg.variantId}`">
					<span
						:data-category-id="seg.categoryId"
						:data-variant-id="seg.variantId"
						class="inline rounded box-decoration-clone px-0.5 py-0.5 transition-colors"
						:class="
							highlightedVariantId === seg.variantId
								? 'bg-primary/25 ring-2 ring-primary/50'
								: focusedCategoryId === seg.categoryId
									? 'bg-primary/15 ring-1 ring-primary/30'
									: ''
						"
					>{{ seg.text }}</span><template v-if="idx < segments.length - 1"> </template>
				</template>
			</template>
			<template v-else>
				<span class="text-muted">
					Wähle links Notenstufen und Varianten aus, damit hier die Textausgabe erscheint.
				</span>
			</template>
		</div>
	</div>
</template>
