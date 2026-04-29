<script setup lang="ts">
import {
	getGradeNumericValue,
	isOptionalPartEnabled,
	namePartOverrideKey,
} from '~/utils/reportText'
import type { NamePartOverrides, NamePartReplacementKey } from '~/types/student'
import type { Category, Grade, SentencePart, Variant } from '~/types/template'

type OptionalTextPart = Extract<SentencePart, { type: 'optionalText' }>
type NamePartSelectionValue = NamePartReplacementKey | 'name'

export interface CategoryRow {
	subjectLabel: string
	categoryId: string
	categoryLabel: string
	category: Category
	grades: Grade[]
	selectedGradeId: string | null
	selectedVariantIds: string[]
	optionalPartOverrides: Record<string, boolean>
	namePartOverrides: NamePartOverrides
	variants: Variant[]
	selectedPreviewText: string
	variantPreviewById: Record<string, string>
}

export interface SubjectGroup {
	subjectLabel: string
	subjectId: string
	categories: CategoryRow[]
}

const props = defineProps<{
	subjectGroups: SubjectGroup[]
	focusedCategoryId: string | null
	selectedSubjectId?: string | null
	studentName: string
	studentGender: 'male' | 'female'
}>()

const emit = defineEmits<{
	focusCategory: [categoryId: string]
	setGrade: [categoryId: string, category: Category, grade: Grade]
	disableCategory: [categoryId: string]
	toggleVariant: [categoryId: string, category: Category, variantId: string]
	toggleOptionalPart: [
		categoryId: string,
		category: Category,
		variantId: string,
		partId: string,
		enabled: boolean,
	]
	setNamePartReplacement: [
		categoryId: string,
		category: Category,
		variantId: string,
		partIndex: number,
		replacementKey: NamePartReplacementKey | null,
	]
	selectAllVariants: [categoryId: string, category: Category]
	clearAllVariants: [categoryId: string, category: Category]
	'update:selectedSubjectId': [subjectId: string]
}>()

function isVariantSelected(variantId: string, row: CategoryRow): boolean {
	return row.selectedVariantIds.includes(variantId)
}

function selectedVariantCount(row: CategoryRow): number {
	return row.selectedVariantIds.length
}

function defaultVariantIds(row: CategoryRow): string[] {
	const firstVariant = row.variants[0]
	return firstVariant ? [firstVariant.id] : []
}

function isDefaultSelection(row: CategoryRow): boolean {
	const defaults = defaultVariantIds(row)
	return (
		defaults.length === row.selectedVariantIds.length &&
		defaults.every((variantId, index) => row.selectedVariantIds[index] === variantId)
	)
}

function isLastSelectedVariant(variantId: string, row: CategoryRow): boolean {
	return row.selectedVariantIds.length === 1 && row.selectedVariantIds[0] === variantId
}

function canToggleVariant(variantId: string, row: CategoryRow): boolean {
	return !isLastSelectedVariant(variantId, row)
}

function allVariantsSelected(row: CategoryRow): boolean {
	if (!row.selectedGradeId) return false
	return row.variants.length > 0 && selectedVariantCount(row) >= row.variants.length
}

function selectedVariants(row: CategoryRow): Variant[] {
	return row.variants.filter((variant) => isVariantSelected(variant.id, row))
}

function isOptionalTextSelected(part: OptionalTextPart, row: CategoryRow): boolean {
	return isOptionalPartEnabled(part, row.optionalPartOverrides)
}

function toggleOptionalTextPart(
	row: CategoryRow,
	variant: Variant,
	part: OptionalTextPart,
	enabled: boolean
) {
	emit(
		'toggleOptionalPart',
		row.categoryId,
		row.category,
		variant.id,
		part.id,
		enabled
	)
}

function findOptionalTextPart(variant: Variant, partId: string): OptionalTextPart | null {
	return (
		variant.sentences.find(
			(part): part is OptionalTextPart => part.type === 'optionalText' && part.id === partId
		) ?? null
	)
}

function namePartSelectionValue(
	row: CategoryRow,
	variantId: string,
	partIndex: number
): NamePartSelectionValue {
	return row.namePartOverrides[namePartOverrideKey(variantId, partIndex)] ?? 'name'
}

function setNamePartReplacement(
	row: CategoryRow,
	variant: Variant,
	partIndex: number,
	value: NamePartSelectionValue
) {
	emit(
		'setNamePartReplacement',
		row.categoryId,
		row.category,
		variant.id,
		partIndex,
		value === 'name' ? null : value
	)
}

function namePartSelectionsForVariant(row: CategoryRow, variant: Variant): Record<number, NamePartSelectionValue> {
	const selections: Record<number, NamePartSelectionValue> = {}
	for (const [partIndex, part] of variant.sentences.entries()) {
		if (part.type !== 'name') continue
		selections[partIndex] = namePartSelectionValue(row, variant.id, partIndex)
	}
	return selections
}

function variantSummary(row: CategoryRow): string {
	const count = selectedVariantCount(row)
	const total = row.variants.length
	if (count === 0) return 'Keine Variante ausgewählt'
	if (count === total) return 'Alle Varianten ausgewählt'
	if (count === 1) return '1 Variante ausgewählt'
	return `${count} Varianten ausgewählt`
}

function subjectIdForFocusedCategory(): string | null {
	if (!props.focusedCategoryId) return null
	return (
		props.subjectGroups.find((group) =>
			group.categories.some((category) => category.categoryId === props.focusedCategoryId)
		)?.subjectId ?? null
	)
}

function fallbackSubjectId(): string {
	return subjectIdForFocusedCategory() ?? props.subjectGroups[0]?.subjectId ?? ''
}

const activeSubjectId = ref('')

function setActiveSubjectId(subjectId: string) {
	if (activeSubjectId.value === subjectId) return
	activeSubjectId.value = subjectId
	emit('update:selectedSubjectId', subjectId)
}

watch(
	() => props.subjectGroups.map((group) => group.subjectId),
	(subjectIds) => {
		if (!subjectIds.length) {
			activeSubjectId.value = ''
			return
		}
		if (props.selectedSubjectId && subjectIds.includes(props.selectedSubjectId)) {
			setActiveSubjectId(props.selectedSubjectId)
			return
		}
		if (!subjectIds.includes(activeSubjectId.value)) {
			setActiveSubjectId(fallbackSubjectId())
		}
	},
	{ immediate: true }
)

watch(
	() => props.selectedSubjectId,
	(nextSelectedSubjectId) => {
		if (!nextSelectedSubjectId) return
		const subjectExists = props.subjectGroups.some((group) => group.subjectId === nextSelectedSubjectId)
		if (!subjectExists || activeSubjectId.value === nextSelectedSubjectId) return
		activeSubjectId.value = nextSelectedSubjectId
	}
)

watch(
	() => props.focusedCategoryId,
	() => {
		if (!activeSubjectId.value) {
			setActiveSubjectId(fallbackSubjectId())
		}
	}
)

const subjectTabItems = computed(() =>
	props.subjectGroups.map((group) => ({
		label: group.subjectLabel,
		value: group.subjectId,
	}))
)

const activeSubjectGroup = computed(
	() => props.subjectGroups.find((group) => group.subjectId === activeSubjectId.value) ?? null
)

const activeCategoryTotal = computed(
	() => activeSubjectGroup.value?.categories.length ?? 0
)

const activeSelectedCategoryCount = computed(
	() =>
		activeSubjectGroup.value?.categories.filter((category) => category.selectedGradeId).length ??
		0
)

const activeCategoryProgressLabel = computed(
	() =>
		`${activeSelectedCategoryCount.value} aktiv, ${activeCategoryTotal.value - activeSelectedCategoryCount.value} deaktiviert`
)

function formatAverage(value: number): string {
	return value.toLocaleString('de-DE', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})
}

const templateGradeRange = computed(() => {
	const values: number[] = []
	for (const group of props.subjectGroups) {
		for (const row of group.categories) {
			for (const grade of row.grades) {
				const value = getGradeNumericValue(grade)
				if (value !== null) values.push(value)
			}
		}
	}
	if (values.length === 0) return null
	return {
		minGrade: Math.min(...values),
		maxGrade: Math.max(...values),
	}
})

const activeSubjectAverageSummary = computed(() => {
	const group = activeSubjectGroup.value
	const range = templateGradeRange.value
	if (!group || !range) return null
	const values = group.categories
		.map((row) => row.grades.find((grade) => grade.id === row.selectedGradeId))
		.map((grade) => (grade ? getGradeNumericValue(grade) : null))
		.filter((value): value is number => value !== null)
	if (values.length === 0) return null

	const average = values.reduce((sum, value) => sum + value, 0) / values.length
	const rangeSize = range.maxGrade - range.minGrade
	const progress = rangeSize === 0
		? 1
		: Math.min(1, Math.max(0, (range.maxGrade - average) / rangeSize))
	return { average, count: values.length, progress }
})
</script>

<template>
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-default bg-default/80 shadow-sm">
		<div class="border-b border-default px-4 py-3">
			<div class="flex items-start justify-between gap-3">
				<div class="space-y-1">
					<div class="text-sm font-medium text-default">Satzauswahl</div>
					<p class="text-xs leading-relaxed text-muted">
						Wähle pro Kategorie eine Stufe und mindestens eine Variante. Die aktive Auswahl wird in der Textausgabe hervorgehoben.
					</p>
				</div>
				<div class="flex shrink-0 items-start gap-3">
					<CategoryProgressCircle
						v-if="activeSubjectAverageSummary"
						:value="Math.round(activeSubjectAverageSummary.progress * 100)"
						:total="100"
						:display-value="formatAverage(activeSubjectAverageSummary.average)"
						:label="`Durchschnitt ${formatAverage(activeSubjectAverageSummary.average)} im aktiven Fach`"
						below-label="Ø Fach"
						tone="success"
					/>
					<CategoryProgressCircle
						:value="activeSelectedCategoryCount"
						:total="activeCategoryTotal"
						:label="activeCategoryProgressLabel"
						below-label="Kategorien"
					/>
				</div>
			</div>
		</div>
		<div class="border-b border-default px-4 py-3">
			<HorizontalScrollableTabStrip
				:items="subjectTabItems"
				:model-value="activeSubjectId"
				@update:modelValue="setActiveSubjectId(($event as string) ?? '')"
				:search-enabled="true"
				search-placeholder="Fach suchen"
				left-aria-label="Fächer nach links scrollen"
				right-aria-label="Fächer nach rechts scrollen"
				search-aria-label="Fächer suchen"
			/>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			<div v-if="activeSubjectGroup" class="flex flex-col gap-3 pb-3">
				<div
					v-if="activeSubjectGroup.categories.length === 0"
					class="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-default px-4 text-sm text-muted"
				>
					In diesem Fach sind noch keine auswählbaren Kategorien vorhanden.
				</div>
				<div
					v-for="row in activeSubjectGroup.categories"
					:key="row.categoryId"
					class="rounded-lg border border-default bg-default p-4 space-y-3 cursor-pointer shadow-sm transition-colors hover:bg-elevated/40"
					:class="focusedCategoryId === row.categoryId ? 'bg-primary/5 border-primary/30 shadow-none' : ''"
					role="button"
					tabindex="0"
					:aria-pressed="focusedCategoryId === row.categoryId"
					@click="emit('focusCategory', row.categoryId)"
					@keydown.enter.self="emit('focusCategory', row.categoryId)"
					@keydown.space.self.prevent="emit('focusCategory', row.categoryId)"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="text-sm font-medium text-default">
								{{ row.categoryLabel }}
							</div>
							<p class="mt-1 text-xs text-muted">
								{{
									row.selectedGradeId
										? variantSummary(row)
										: 'Noch deaktiviert. Wähle eine Stufe, um diese Kategorie in den Text aufzunehmen.'
								}}
							</p>
						</div>
						<div class="flex items-center gap-2" @click.stop>
							<UBadge
								color="neutral"
								variant="soft"
								size="sm"
								:label="row.selectedGradeId ? `${selectedVariantCount(row)} aktiv` : 'Deaktiviert'"
							/>
							<UButton
								v-if="row.selectedGradeId"
								label="Deaktivieren"
								size="xs"
								color="neutral"
								variant="ghost"
								@click.stop="emit('disableCategory', row.categoryId)"
							/>
						</div>
					</div>
					<div
						v-if="!row.selectedGradeId && row.grades.length"
						class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-elevated/40 px-3 py-2"
						@click.stop
					>
						<p class="text-xs font-medium text-default">
							Kategorie aktivieren
						</p>
						<UButton
							:label="`Stufe ${row.grades[0]?.label ?? ''} wählen`"
							size="xs"
							color="neutral"
							variant="outline"
							@click.stop="
								row.grades[0] &&
								emit('setGrade', row.categoryId, row.category, row.grades[0])
							"
						/>
					</div>
					<span class="text-xs font-medium text-muted">
						{{ row.selectedGradeId ? 'Stufe' : 'Stufe wählen' }}
					</span>
					<div class="flex flex-wrap gap-1.5" @click.stop>
						<TemplatePill
							v-for="grade in row.grades"
							:key="grade.id"
							:label="grade.label"
							:active="row.selectedGradeId === grade.id"
							:selectable="true"
							@click.stop="emit('setGrade', row.categoryId, row.category, grade)"
						/>
					</div>
					<div
						v-if="row.selectedGradeId"
						class="rounded-md border border-default bg-elevated/40 px-3 py-2"
					>
						<div class="text-xs font-medium text-muted">Vorschau</div>
						<div
							v-if="row.selectedPreviewText && row.variants.length > 1"
							class="mt-1 text-xs leading-relaxed text-default"
						>
							{{ row.selectedPreviewText }}
						</div>
						<div
							v-else-if="row.selectedPreviewText"
							class="mt-1"
							@click.stop
							@keydown.enter.stop
							@keydown.space.stop
						>
							<VariantSentenceInlinePreview
								v-for="variant in selectedVariants(row)"
								:key="variant.id"
								:variant="variant"
								:preview-text="row.variantPreviewById[variant.id] ?? ''"
								:preview-name="studentName.trim()"
								:preview-gender="studentGender"
								:name-part-selections="namePartSelectionsForVariant(row, variant)"
								:optional-part-enabled-map="row.optionalPartOverrides"
								:text-class="'text-xs text-default'"
								@toggle-optional-text="
									(partId, enabled) => {
										const part = findOptionalTextPart(variant, partId)
										if (part) toggleOptionalTextPart(row, variant, part, enabled)
									}
								"
								@set-name-part-selection="
									(partIndex, value) =>
										setNamePartReplacement(row, variant, partIndex, value)
								"
							/>
						</div>
						<p v-else class="mt-1 text-xs leading-relaxed text-default">
							Keine Variante ausgewählt. Wähle unten eine oder mehrere Varianten aus.
						</p>
					</div>
					<template v-if="row.selectedGradeId && row.variants.length > 1">
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-medium text-muted">Varianten</span>
							<div class="flex items-center gap-1" @click.stop>
								<UButton
									label="Alle"
									size="xs"
									color="neutral"
									variant="ghost"
									:disabled="allVariantsSelected(row)"
									@click="emit('selectAllVariants', row.categoryId, row.category)"
								/>
								<UButton
									label="Standard"
									size="xs"
									color="neutral"
									variant="ghost"
									:disabled="isDefaultSelection(row)"
									@click="emit('clearAllVariants', row.categoryId, row.category)"
								/>
							</div>
						</div>
						<div class="grid gap-3 xl:grid-cols-2" @click.stop>
							<div
								v-for="variant in row.variants"
								:key="variant.id"
								class="rounded-lg border border-default p-3 transition-colors"
								:class="
									canToggleVariant(variant.id, row)
										? [
												'cursor-pointer',
												isVariantSelected(variant.id, row)
													? 'bg-primary/5 border-primary/30'
													: 'hover:bg-elevated/40',
											]
										: 'bg-primary/5 border-primary/30'
								"
								:tabindex="canToggleVariant(variant.id, row) ? 0 : undefined"
								:aria-pressed="isVariantSelected(variant.id, row)"
								:aria-disabled="!canToggleVariant(variant.id, row)"
								role="button"
								@click.stop="
									canToggleVariant(variant.id, row) &&
									emit('toggleVariant', row.categoryId, row.category, variant.id)
								"
								@keydown.enter.self="
									canToggleVariant(variant.id, row) &&
									emit('toggleVariant', row.categoryId, row.category, variant.id)
								"
								@keydown.space.self.prevent="
									canToggleVariant(variant.id, row) &&
									emit('toggleVariant', row.categoryId, row.category, variant.id)
								"
							>
								<div
									class="text-sm font-medium"
									:class="isVariantSelected(variant.id, row) ? 'text-primary' : 'text-default'"
								>
									{{ variant.label }}
								</div>
								<div
									v-if="row.variantPreviewById[variant.id]"
									class="mt-3"
									@click.stop
									@keydown.enter.stop
									@keydown.space.stop
								>
									<VariantSentenceInlinePreview
										:variant="variant"
										:preview-text="row.variantPreviewById[variant.id] ?? ''"
										:preview-name="studentName.trim()"
										:preview-gender="studentGender"
										:name-part-selections="namePartSelectionsForVariant(row, variant)"
										:optional-part-enabled-map="row.optionalPartOverrides"
										:text-class="'text-sm text-muted'"
										@toggle-optional-text="
											(partId, enabled) => {
												const part = findOptionalTextPart(variant, partId)
												if (part) toggleOptionalTextPart(row, variant, part, enabled)
											}
										"
										@set-name-part-selection="
											(partIndex, value) =>
												setNamePartReplacement(row, variant, partIndex, value)
										"
									/>
								</div>
								<p v-else class="mt-3 text-sm leading-6 text-muted">
									Kein Vorschautext verfügbar.
								</p>
								<p
									v-if="isLastSelectedVariant(variant.id, row)"
									class="mt-2 text-xs font-medium text-primary"
								>
									Mindestens eine Variante muss aktiv bleiben.
								</p>
							</div>
						</div>
						<div class="flex items-center justify-between gap-3 text-xs text-muted">
							<span>
								{{ variantSummary(row) }}
							</span>
							<span>Standard setzt auf die erste Variante zurück.</span>
						</div>
					</template>
				</div>
			</div>
			<div
				v-else
				class="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
			>
				Keine Fächer verfügbar.
			</div>
		</div>
	</div>
</template>
