<script setup lang="ts">
import type { Student } from '~/types/student'

const props = defineProps<{
	student: Student
	yearTabItems: { label: string; value: string }[]
	effectiveTemplateSetId: string | null
}>()

const emit = defineEmits<{
	update: [field: keyof Omit<Student, 'id'>, value: string]
}>()

const genderOptions = [
	{ value: 'male', label: 'Männlich' },
	{ value: 'female', label: 'Weiblich' },
]
</script>

<template>
	<div class="flex flex-col gap-3">
		<UTabs
			:items="yearTabItems"
			:model-value="effectiveTemplateSetId ?? undefined"
			:content="false"
			class="w-full"
			@update:model-value="(v) => emit('update', 'templateSetId', (v as string) ?? '')"
		/>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<UFormField label="Vorname" name="student-name">
				<UInput
					id="student-name"
					:model-value="student.name"
					placeholder="Vorname"
					@update:model-value="(v) => emit('update', 'name', v ?? '')"
				/>
			</UFormField>
			<UFormField label="Nachname" name="student-surname">
				<UInput
					id="student-surname"
					:model-value="student.surname"
					placeholder="Nachname"
					@update:model-value="(v) => emit('update', 'surname', v ?? '')"
				/>
			</UFormField>
			<UFormField
				label="Sprachform"
				name="student-gender"
			>
				<USelectMenu
					id="student-gender"
					:model-value="student.gender"
					:items="genderOptions"
					value-key="value"
					@update:model-value="(v) => emit('update', 'gender', v ?? 'male')"
				/>
			</UFormField>
		</div>
	</div>
</template>
