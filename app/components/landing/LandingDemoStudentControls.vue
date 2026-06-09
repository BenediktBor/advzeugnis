<script setup lang="ts">
import { useLandingDemoContext } from '~/composables/useLandingDemoContext'
import { studentGenderItems } from '~/constants/templateEditor'

const demo = useLandingDemoContext()

const student = computed(() => demo.student.value)
const coverageSummary = computed(() => demo.coverageSummary.value)
</script>

<template>
	<div class="flex flex-wrap items-end gap-3">
		<UFormField label="Vorname" name="demo-name" class="w-full min-w-0 flex-1 sm:min-w-[120px]">
			<UInput
				:model-value="student.name"
				placeholder="Vorname"
				@update:model-value="demo.setStudentName(String($event ?? ''))"
			/>
		</UFormField>
		<UFormField label="Geschlecht" name="demo-gender" class="w-full min-w-0 sm:w-auto sm:min-w-[140px]">
			<USelect
				:model-value="student.gender"
				:items="studentGenderItems"
				value-key="value"
				@update:model-value="demo.setStudentGender($event as 'male' | 'female')"
			/>
		</UFormField>
		<CategoryProgressCircle
			class="basis-full sm:basis-auto"
			:value="coverageSummary.completed"
			:total="coverageSummary.total"
			label="Fortschritt"
			tone="primary"
		/>
	</div>
</template>
