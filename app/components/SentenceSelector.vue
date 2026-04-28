<script setup lang="ts">
import { isOptionalPartEnabled } from '~/composables/useReportText'
import type { Category, Grade, SentencePart, Variant } from '~/types/template'

type OptionalTextPart = Extract<SentencePart, { type: 'optionalText' }>

export interface CategoryRow {
	subjectLabel: string
	categoryId: string
	categoryLabel: string
	category: Category
	grades: Grade[]
	selectedGradeId: string | null
	selectedVariantIds: string[]
	optionalPartOverrides: Record<string, boolean>
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

function resolveInlinePreviewPart(part: SentencePart, row: CategoryRow): string {
	switch (part.type) {
		case 'text':
			return part.value
		case 'genderVariant':
			return props.studentGender === 'male' ? part.value[0] ?? '' : part.value[1] ?? ''
		case 'name':
			return part.value?.trim() ?? props.studentName.trim()
		case 'optionalText':
			return isOptionalTextSelected(part, row) ? part.value : ''
		default:
			return ''
	}
}

function inlinePreviewText(variant: Variant, row: CategoryRow): string {
	return variant.sentences
		.map((part) => resolveInlinePreviewPart(part, row).trim())
		.filter(Boolean)
		.join(' ')
}

function inlinePreviewSuffix(variant: Variant, row: CategoryRow): string {
	const text = inlinePreviewText(variant, row)
	if (!text || /[.!?]$/.test(text)) return ''
	const preview = row.variantPreviewById[variant.id]?.trim() ?? ''
	return preview.match(/[.!?]$/)?.[0] ?? '.'
}

function toggleOptionalTextPart(
	row: CategoryRow,
	variant: Variant,
	part: OptionalTextPart,
	event: Event
) {
	emit(
		'toggleOptionalPart',
		row.categoryId,
		row.category,
		variant.id,
		part.id,
		(event.target as HTMLInputElement).checked
	)
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

const selectedCategoryCount = computed(() =>
	props.subjectGroups.reduce(
		(total, group) =>
			total + group.categories.filter((category) => category.selectedGradeId).length,
		0
	)
)

const selectedVariantTotal = computed(() =>
	props.subjectGroups.reduce(
		(total, group) =>
			total +
			group.categories.reduce(
				(categoryTotal, category) => categoryTotal + category.selectedVariantIds.length,
				0
			),
		0
	)
)
</script>

<template>
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-default bg-default/80 shadow-sm">
		<div class="border-b border-default px-4 py-3">
			<div class="flex items-start justify-between gap-3">
				<div class="space-y-1">
					<div class="text-sm font-medium text-default">Satzauswahl</div>
					<p class="text-xs leading-relaxed text-muted">
						Wähle pro Kategorie eine Stufe und mindestens eine Variante.
					</p>
				</div>
				<div class="shrink-0 text-right text-xs text-muted">
					<div>{{ selectedCategoryCount }} Kategorien aktiv</div>
					<div>{{ selectedVariantTotal }} Varianten ausgewählt</div>
				</div>
			</div>
		</div>
		<div class="border-b border-default px-4 py-3">
			<UTabs
				:items="subjectTabItems"
				:model-value="activeSubjectId || undefined"
				:content="false"
				class="w-full"
				@update:model-value="setActiveSubjectId(($event as string) ?? '')"
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
					@keydown.enter="emit('focusCategory', row.categoryId)"
					@keydown.space.prevent="emit('focusCategory', row.categoryId)"
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
										: 'Kategorie deaktiviert. Wähle eine Stufe, um sie wieder einzuschalten.'
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
					<span class="text-xs font-medium text-muted">Stufe</span>
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
							v-if="row.selectedPreviewText"
							class="mt-1 flex flex-col gap-1 text-xs leading-relaxed text-default"
							@click.stop
						>
							<div
								v-for="variant in selectedVariants(row)"
								:key="variant.id"
								class="flex flex-wrap items-center gap-x-1.5 gap-y-1"
							>
								<div
									v-if="selectedVariantCount(row) > 1"
									class="mr-1 font-medium text-muted"
								>
									{{ variant.label }}:
								</div>
								<template
									v-for="(part, partIndex) in variant.sentences"
									:key="`${variant.id}-${partIndex}`"
								>
									<label
										v-if="part.type === 'optionalText'"
										class="inline-flex items-center gap-1.5 rounded border border-default px-1.5 py-0.5 hover:bg-elevated"
									>
										<input
											type="checkbox"
											class="size-3.5 rounded border-default"
											:checked="isOptionalTextSelected(part, row)"
											@change="toggleOptionalTextPart(row, variant, part, $event)"
										>
										<span
											:class="
												isOptionalTextSelected(part, row)
													? 'text-default'
													: 'text-muted line-through'
											"
										>
											{{ part.value }}
										</span>
									</label>
									<span v-else-if="resolveInlinePreviewPart(part, row).trim()">
										{{ resolveInlinePreviewPart(part, row).trim() }}
									</span>
								</template>
								<span v-if="inlinePreviewSuffix(variant, row)" class="-ml-1.5">{{ inlinePreviewSuffix(variant, row) }}</span>
							</div>
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
								@keydown.enter="
									canToggleVariant(variant.id, row) &&
									emit('toggleVariant', row.categoryId, row.category, variant.id)
								"
								@keydown.space.prevent="
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
								<p class="mt-3 text-sm leading-6 text-muted">
									{{ row.variantPreviewById[variant.id] || 'Kein Vorschautext verfügbar.' }}
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
