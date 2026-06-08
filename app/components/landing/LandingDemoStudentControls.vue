<script setup lang="ts">
import { useLandingDemoContext } from '~/composables/useLandingDemoContext'
import { studentGenderItems } from '~/constants/templateEditor'

const demo = useLandingDemoContext()

const student = computed(() => demo.student.value)
const coverageSummary = computed(() => demo.coverageSummary.value)
</script>

<template>
	<div class="flex flex-wrap items-end gap-3">
		<UFormField label="Vorname" name="demo-name" class="min-w-[120px] flex-1">
			<UInput
				:model-value="student.name"
				placeholder="Vorname"
				@update:model-value="demo.setStudentName(String($event ?? ''))"
			/>
		</UFormField>
		<UFormField label="Geschlecht" name="demo-gender" class="min-w-[140px]">
			<USelect
				:model-value="student.gender"
				:items="studentGenderItems"
				value-key="value"
				@update:model-value="demo.setStudentGender($event as 'male' | 'female')"
			/>
		</UFormField>
		<CategoryProgressCircle
			:value="coverageSummary.completed"
			:total="coverageSummary.total"
			label="Fortschritt"
			tone="primary"
		/>
	</div>
</template>
