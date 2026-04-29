<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'

type TabItem = {
	label: string
	value: string
}

const props = withDefaults(
	defineProps<{
		items: TabItem[]
		modelValue: string | null
		searchEnabled?: boolean
		searchPlaceholder?: string
		leftAriaLabel?: string
		rightAriaLabel?: string
		searchAriaLabel?: string
	}>(),
	{
		searchEnabled: true,
		searchPlaceholder: 'Suchen',
		leftAriaLabel: 'Nach links scrollen',
		rightAriaLabel: 'Nach rechts scrollen',
		searchAriaLabel: 'Fächer suchen',
	}
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const scrollEl = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
	const el = scrollEl.value
	if (!el) {
		canScrollLeft.value = false
		canScrollRight.value = false
		return
	}
	const epsilon = 2
	canScrollLeft.value = el.scrollLeft > epsilon
	canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - epsilon
}

function scrollByDirection(direction: -1 | 1) {
	const el = scrollEl.value
	if (!el) return
	const delta = Math.max(Math.round(el.clientWidth * 0.65), 140)
	el.scrollBy({ left: direction * delta, behavior: 'smooth' })
}

function scrollActiveIntoView() {
	const container = scrollEl.value
	const id = props.modelValue
	if (!container || !id) return

	const escaped =
		typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
			? CSS.escape(id)
			: id.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
	const tab = container.querySelector(`[data-tab-value="${escaped}"]`) as HTMLElement | null
	tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
}

useResizeObserver(scrollEl, () => {
	updateScrollState()
})

const dropdownItems = computed(() =>
	props.items.map((item) => ({
		label: item.label,
		value: item.value,
		onSelect: () => emit('update:modelValue', item.value),
	}))
)

watch(
	() => props.items,
	() => {
		nextTick(() => updateScrollState())
	},
	{ deep: false }
)

watch(
	() => props.modelValue,
	() => {
		nextTick(() => {
			scrollActiveIntoView()
			updateScrollState()
		})
	}
)

onMounted(() => {
	nextTick(() => updateScrollState())
})
</script>

<template>
	<div class="flex min-w-0 items-stretch gap-1">
		<UButton
			icon="i-lucide-chevron-left"
			size="sm"
			color="neutral"
			variant="soft"
			class="shrink-0 self-center"
			:aria-label="leftAriaLabel"
			:disabled="!canScrollLeft"
			@click="scrollByDirection(-1)"
		/>

		<div
			ref="scrollEl"
			role="tablist"
			aria-label="Tab-Leiste"
			class="min-h-11 min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:auto] [scrollbar-width:thin]"
			@scroll.passive="updateScrollState"
		>
			<div class="flex min-h-11 w-max items-center gap-1.5 pr-1">
				<button
					v-for="item in items"
					:key="item.value"
					type="button"
					role="tab"
					:data-tab-value="item.value"
					:aria-selected="modelValue === item.value"
					tabindex="0"
					class="max-w-none shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					:class="
						modelValue === item.value
							? 'bg-primary text-white shadow-sm'
							: 'text-muted hover:bg-elevated hover:text-default'
					"
					@click="emit('update:modelValue', item.value)"
				>
					{{ item.label }}
				</button>
			</div>
		</div>

		<UButton
			icon="i-lucide-chevron-right"
			size="sm"
			color="neutral"
			variant="soft"
			class="shrink-0 self-center"
			:aria-label="rightAriaLabel"
			:disabled="!canScrollRight"
			@click="scrollByDirection(1)"
		/>

		<UDropdownMenu
			v-if="searchEnabled && items.length > 0"
			:items="dropdownItems"
			:content="{ align: 'end' }"
			:ui="{ content: 'w-72' }"
			size="sm"
			:filter="{ placeholder: searchPlaceholder, variant: 'none' }"
		>
			<UButton
				icon="i-lucide-search"
				size="sm"
				color="neutral"
				variant="soft"
				class="shrink-0 self-center"
				:aria-label="searchAriaLabel"
				@click.stop
			/>
		</UDropdownMenu>
	</div>
</template>

