<script setup lang="ts">
defineProps<{
	modelValue: string
	name?: string
	placeholder?: string
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
	<UFormField label="Vorlagensatz" :name="name ?? 'student-stam-template'" required>
		<USelectMenu
			:model-value="modelValue"
			:items="items"
			value-key="value"
			:placeholder="placeholder ?? 'Vorlage wählen'"
			class="w-full"
			@update:model-value="emit('update:modelValue', ($event as string) ?? '')"
		/>
	</UFormField>
</template>
