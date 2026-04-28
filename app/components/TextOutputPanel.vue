<script setup lang="ts">
import type { ReportSegment } from '~/utils/reportText'

const props = defineProps<{
	segments: ReportSegment[]
	focusedCategoryId: string | null
	highlightedVariantId: string | null
}>()

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
	}
)
</script>

<template>
	<div class="flex flex-col flex-1 min-h-0 gap-2">
		<UFormField label="Textausgabe" name="text-output" class="flex-1 min-h-0 flex flex-col">
			<div
				ref="outputRef"
				id="text-output"
				class="flex-1 min-h-[200px] w-full overflow-auto rounded-md border border-default bg-default px-3 py-2 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary"
				role="region"
				tabindex="0"
				aria-label="Textausgabe"
			>
				<template v-if="segments.length">
					<template v-for="(seg, idx) in segments" :key="`${seg.categoryId}:${seg.variantId}`">
						<span
							:data-category-id="seg.categoryId"
							:data-variant-id="seg.variantId"
							class="inline-block rounded py-0.5 transition-colors"
							:class="
								highlightedVariantId === seg.variantId
									? 'bg-primary/25 ring-2 ring-primary/50'
									: focusedCategoryId === seg.categoryId
										? 'bg-primary/15 ring-1 ring-primary/30'
										: ''
							"
						>{{ seg.text }}</span>
						<span v-if="idx < segments.length - 1" aria-hidden="true">&nbsp;</span>
					</template>
				</template>
				<template v-else>
					<span class="text-muted">
						Wähle links Notenstufen und Varianten aus, damit hier die Textausgabe erscheint.
					</span>
				</template>
			</div>
		</UFormField>
	</div>
</template>
