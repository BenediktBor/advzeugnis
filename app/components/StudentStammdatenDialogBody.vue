<script setup lang="ts">
import type { GradeAverageSummary } from '~/utils/reportText'

defineProps<{
	name: string
	surname: string
	gender: 'male' | 'female'
	templateSetId: string
	heroIcon: string
	heroTitle: string
	heroDescription: string
	showGradeSummary?: boolean
	gradeAverageSummary?: GradeAverageSummary | null
	nameFieldName?: string
	surnameFieldName?: string
	genderFieldName?: string
	templateFieldName?: string
	namePlaceholder?: string
	surnamePlaceholder?: string
	submitOnEnter?: boolean
}>()

const emit = defineEmits<{
	'update:name': [value: string]
	'update:surname': [value: string]
	'update:gender': [value: 'male' | 'female']
	'update:templateSetId': [value: string]
	submit: []
}>()

const genderItems = [
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]

function formatAverage(value: number): string {
	return value.toLocaleString('de-DE', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})
}
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="rounded-lg border border-default bg-elevated/40 p-3">
			<div class="flex items-start gap-3">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<UIcon :name="heroIcon" class="size-5" />
				</div>
				<div class="min-w-0">
					<p class="text-sm font-medium text-default">{{ heroTitle }}</p>
					<p class="mt-1 text-sm text-muted">
						{{ heroDescription }}
					</p>
				</div>
			</div>
		</div>

		<section class="space-y-3">
			<div>
				<h3 class="text-sm font-medium text-default">Schülerdaten</h3>
				<p class="text-xs text-muted">Diese Angaben erscheinen in der Schülerliste und im Zeugnis.</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<UFormField label="Vorname" :name="nameFieldName ?? 'student-stam-name'" required>
					<UInput
						:model-value="name"
						:placeholder="namePlaceholder ?? 'Vorname'"
						autofocus
						@update:model-value="emit('update:name', $event ?? '')"
						@keydown.enter.prevent="submitOnEnter && emit('submit')"
					/>
				</UFormField>
				<UFormField label="Nachname" :name="surnameFieldName ?? 'student-stam-surname'">
					<UInput
						:model-value="surname"
						:placeholder="surnamePlaceholder ?? 'Nachname'"
						@update:model-value="emit('update:surname', $event ?? '')"
						@keydown.enter.prevent="submitOnEnter && emit('submit')"
					/>
				</UFormField>
			</div>
		</section>

		<section class="space-y-3">
			<div>
				<h3 class="text-sm font-medium text-default">Zeugnisgrundlage</h3>
				<p class="text-xs text-muted">
					Geschlecht und Vorlagensatz steuern die Satzvorschläge im Zeugnis.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<UFormField label="Geschlecht" :name="genderFieldName ?? 'student-stam-gender'">
					<div class="grid grid-cols-2 gap-2">
						<UButton
							v-for="item in genderItems"
							:key="item.value"
							:label="item.label"
							:variant="gender === item.value ? 'solid' : 'outline'"
							:color="gender === item.value ? 'primary' : 'neutral'"
							block
							@click="emit('update:gender', item.value)"
						/>
					</div>
				</UFormField>
				<TemplateSetSelectField
					:model-value="templateSetId"
					:name="templateFieldName"
					@update:model-value="emit('update:templateSetId', $event)"
				/>
			</div>
		</section>

		<section v-if="showGradeSummary" class="space-y-3">
			<div>
				<h3 class="text-sm font-medium text-default">Notendurchschnitt</h3>
				<p class="text-xs text-muted">
					Berechnet aus den gewählten Stufen im aktiven Vorlagensatz.
				</p>
			</div>
			<div
				class="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-default bg-muted/30 px-3 py-2"
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
		</section>
	</div>
</template>
