<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		title: string
		description?: string
		icon?: string
		tone?: 'default' | 'primary' | 'error'
		loading?: boolean
	}>(),
	{
		description: '',
		icon: '',
		tone: 'default',
		loading: false,
	}
)

const toneClasses = computed(() => {
	if (props.tone === 'primary') return 'border-primary/30 bg-primary/5'
	if (props.tone === 'error') return 'border-error/30 bg-error/5'
	return 'border-default bg-default'
})

const iconName = computed(() =>
	props.loading ? 'i-lucide-loader-2' : props.icon
)
</script>

<template>
	<div
		class="rounded-lg border p-4 text-sm"
		:class="toneClasses"
		:role="tone === 'error' ? 'alert' : undefined"
	>
		<div class="flex items-start gap-3">
			<UIcon
				v-if="iconName"
				:name="iconName"
				class="mt-0.5 size-5 shrink-0 text-muted"
				:class="loading ? 'animate-spin' : ''"
				aria-hidden="true"
			/>
			<div class="min-w-0">
				<p class="font-medium text-default">{{ title }}</p>
				<p v-if="description" class="mt-1 text-muted">
					{{ description }}
				</p>
				<div v-if="$slots.default" class="mt-3 flex flex-wrap gap-2">
					<slot />
				</div>
			</div>
		</div>
	</div>
</template>
