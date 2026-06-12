<script setup lang="ts">
defineProps<{
	modelValue: string
	name?: string
	placeholder?: string
	inline?: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const { visibleSortedSetsWithData } = useTemplateSets()

const items = computed(() =>
	visibleSortedSetsWithData.value.map((setItem) => ({
		label: setItem.label,
		value: setItem.id,
	})),
)
</script>

<template>
	<UFormField
		v-if="!inline"
		label="Vorlagensatz"
		:name="name ?? 'student-stam-template'"
		required
	>
		<USelectMenu
			:model-value="modelValue"
			:items="items"
			value-key="value"
			:placeholder="placeholder ?? 'Vorlage wählen'"
			class="w-full"
			@update:model-value="emit('update:modelValue', ($event as string) ?? '')"
		/>
	</UFormField>
	<USelectMenu
		v-else
		:model-value="modelValue"
		:items="items"
		value-key="value"
		:placeholder="placeholder ?? 'Vorlage wählen'"
		size="sm"
		class="w-44 max-w-full"
		aria-label="Vorlagensatz wählen"
		@update:model-value="emit('update:modelValue', ($event as string) ?? '')"
	/>
</template>
