<script setup lang="ts">
import { genderVariantKey, type GenderVariantOption } from '~/utils/collectGenderVariants'

const props = withDefaults(
	defineProps<{
		genderVariants: GenderVariantOption[]
		maxVisibleGenderVariants?: number
		showOptionalGroup?: boolean
	}>(),
	{
		maxVisibleGenderVariants: 4,
		showOptionalGroup: true,
	},
)

const emit = defineEmits<{
	addText: []
	addName: []
	addOptionalGroup: []
	addGenderVariant: [value: [string, string]]
	createGenderVariant: []
}>()

const visibleGenderVariants = computed(() =>
	props.genderVariants.slice(0, props.maxVisibleGenderVariants),
)

const genderVariantMenuItems = computed(() => {
	const variantItems = props.genderVariants.map((variant) => ({
		label: variant.label,
		onSelect: () => emit('addGenderVariant', variant.value),
	}))
	const createItem = {
		label: 'Neue Variante erstellen',
		icon: 'i-lucide-plus',
		onSelect: () => emit('createGenderVariant'),
	}
	if (variantItems.length === 0) {
		return [[createItem]]
	}
	return [variantItems, [createItem]]
})
</script>

<template>
	<div class="flex flex-wrap gap-2">
		<UButton
			label="Text"
			icon="i-lucide-type"
			size="sm"
			variant="soft"
			color="neutral"
			@click="emit('addText')"
		/>
		<UButton
			label="Name"
			icon="i-lucide-user"
			size="sm"
			variant="soft"
			color="neutral"
			@click="emit('addName')"
		/>
		<UButton
			v-if="showOptionalGroup"
			label="Optionale Gruppe"
			icon="i-lucide-toggle-left"
			size="sm"
			variant="soft"
			color="neutral"
			@click="emit('addOptionalGroup')"
		/>
		<UButton
			v-for="variant in visibleGenderVariants"
			:key="genderVariantKey(variant.value)"
			:label="variant.label"
			size="sm"
			variant="outline"
			color="neutral"
			@click="emit('addGenderVariant', variant.value)"
		/>
		<UDropdownMenu
			:items="genderVariantMenuItems"
			:content="{ align: 'end' }"
			:ui="{ content: 'w-72' }"
			size="sm"
			:filter="
				genderVariants.length > 0
					? { placeholder: 'Variante suchen', variant: 'none' }
					: undefined
			"
		>
			<UButton
				icon="i-lucide-more-horizontal"
				size="sm"
				variant="outline"
				color="neutral"
				aria-label="Alle Varianten"
				@click.stop
			/>
		</UDropdownMenu>
	</div>
</template>
