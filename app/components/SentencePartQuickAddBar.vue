<script setup lang="ts">
import { genderVariantPresets } from '~/constants/templateEditor'
import type { GenderVariantPreset } from '~/constants/templateEditor'

withDefaults(
	defineProps<{
		showOptionalGroup?: boolean
	}>(),
	{ showOptionalGroup: true },
)

defineEmits<{
	addText: []
	addName: []
	addGenderPreset: [preset: GenderVariantPreset]
	addOptionalGroup: []
}>()
</script>

<template>
	<div class="flex flex-wrap gap-2">
		<UButton
			label="Text"
			icon="i-lucide-type"
			size="sm"
			variant="soft"
			@click="$emit('addText')"
		/>
		<UButton
			label="Name"
			icon="i-lucide-user"
			size="sm"
			variant="soft"
			color="neutral"
			@click="$emit('addName')"
		/>
		<UButton
			v-for="preset in genderVariantPresets"
			:key="preset.label"
			:label="preset.label"
			size="sm"
			variant="outline"
			color="neutral"
			@click="$emit('addGenderPreset', preset)"
		/>
		<UButton
			v-if="showOptionalGroup"
			label="Optionale Gruppe"
			icon="i-lucide-toggle-left"
			size="sm"
			variant="outline"
			color="neutral"
			@click="$emit('addOptionalGroup')"
		/>
	</div>
</template>
