<script setup lang="ts">
import type { Student } from '~/types/student'
import type { GradeAverageSummary } from '~/utils/reportText'

const props = defineProps<{
	student: Student
	yearTabItems: { label: string; value: string }[]
	effectiveTemplateSetId: string | null
	gradeAverageSummary: GradeAverageSummary | null
}>()

const emit = defineEmits<{
	update: [field: keyof Omit<Student, 'id'>, value: string]
}>()

const genderOptions = [
	{ value: 'male', label: 'Männlich' },
	{ value: 'female', label: 'Weiblich' },
]

function formatAverage(value: number): string {
	return value.toLocaleString('de-DE', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})
}
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
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
				label="Geschlecht"
				name="student-gender"
				description="Steuert Pronomen in den Satzvorlagen."
			>
				<USelectMenu
					id="student-gender"
					:model-value="student.gender"
					:items="genderOptions"
					value-key="value"
					@update:model-value="(v) => emit('update', 'gender', v ?? 'male')"
				/>
			</UFormField>
			<div
				class="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-default bg-muted/30 px-3 py-2 sm:col-span-2 xl:col-span-1"
			>
				<div class="min-w-0">
					<div class="text-sm font-medium text-default">Notendurchschnitt</div>
					<div class="text-xs text-muted">
						<template v-if="gradeAverageSummary">
							{{ gradeAverageSummary.count }} Noten gewertet
						</template>
						<template v-else>
							Nicht verfügbar
						</template>
					</div>
				</div>
				<CategoryProgressCircle
					v-if="gradeAverageSummary"
					class="shrink-0"
					:value="Math.round(gradeAverageSummary.progress * 100)"
					:total="100"
					:display-value="formatAverage(gradeAverageSummary.average)"
					:label="`Notendurchschnitt ${formatAverage(gradeAverageSummary.average)}`"
					below-label="Ø Note"
					tone="success"
				/>
			</div>
		</div>
	</div>
</template>
