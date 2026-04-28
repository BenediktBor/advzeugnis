<script setup lang="ts">
import type { NamePartReplacementKey, Student } from '~/types/student'
import type { Category, Grade } from '~/types/template'
import {
	buildVariantPreviewText,
	buildVariantsPreviewText,
	buildGradeAverageSummary,
	buildReportPlainText,
	buildReportSegments,
	ensureVariantIdsForGrade,
	getEffectiveCategoryEntry,
	getDefaultVariantIdsForGrade,
	namePartOverrideKey,
	normalizeVariantIdsForGrade,
	type ReportSegment,
} from '~/utils/reportText'
import { useLoadedMissingRedirect } from '~/composables/useLoadedMissingRedirect'
import type { SubjectGroup, CategoryRow } from '~/components/SentenceSelector.vue'
import { studentFullName } from '~/utils/student'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { students, updateStudent, deleteStudent, isLoaded, loadError: studentsLoadError } = useStudents()
const { orderedIds, setsWithData, loadError: templatesLoadError } = useTemplateSets()
const { copyToClipboard } = useClipboardCopy()
const rewriter = useAiRewriter()

const effectiveTemplateSetId = computed(() => {
	const s = students.value.find((st) => st.id === id.value)
	if (!s) return null
	return orderedIds.value.includes(s.templateSetId)
		? s.templateSetId
		: orderedIds.value[0] ?? null
})

const { getSet } = useTemplates(
	computed(() => effectiveTemplateSetId.value ?? '')
)
const loadError = computed(() => studentsLoadError.value ?? templatesLoadError.value)

const student = computed(() => students.value.find((s) => s.id === id.value))
const isDeletingStudent = ref(false)
const studentExistsForRedirect = computed(() => isDeletingStudent.value || student.value)

useLoadedMissingRedirect({
	id,
	isLoaded,
	exists: studentExistsForRedirect,
	redirectTo: '/app/students',
	onMissing: () => {
		showError({ statusCode: 404, message: 'Schüler nicht gefunden' })
	},
})

const templateSetForReport = computed(() => {
	if (!student.value || !effectiveTemplateSetId.value) return null
	return getSet()
})

const reportSegments = computed<ReportSegment[]>(() => {
	const s = student.value
	const set = templateSetForReport.value
	if (!s || !set) return []
	return buildReportSegments(s, set)
})

const textOutputContent = computed(() => {
	const s = student.value
	const set = templateSetForReport.value
	if (!s || !set) return ''
	return buildReportPlainText(s, set)
})

const gradeAverageSummary = computed(() => {
	const s = student.value
	const set = templateSetForReport.value
	if (!s || !set) return null
	return buildGradeAverageSummary(s, set)
})

const focusedCategoryId = ref<string | null>(null)
const lastChangedVariantId = ref<string | null>(null)
const hasSelectionWorkspace = computed(
	() => Boolean(effectiveTemplateSetId.value) && subjectGroups.value.length > 0
)
const hasTextOutput = computed(() => textOutputContent.value.trim().length > 0)

function getCategoryEntry(category: Category) {
	const s = student.value
	if (!s) return { gradeId: null as string | null, variantIds: [] as string[] }
	const entry = getEffectiveCategoryEntry(s, category)
	if (!entry) return { gradeId: null as string | null, variantIds: [] as string[] }
	return entry
}

function getStoredCategoryEntry(categoryId: string) {
	return student.value?.reportSelection?.categories?.[categoryId]
}

function getOptionalPartOverrides(categoryId: string) {
	return getStoredCategoryEntry(categoryId)?.optionalPartOverrides ?? {}
}

function getNamePartOverrides(categoryId: string) {
	return getStoredCategoryEntry(categoryId)?.namePartOverrides ?? {}
}

function getSelectedSubjectId() {
	return student.value?.reportSelection?.selectedSubjectId ?? null
}

function setSelectedSubjectId(subjectId: string) {
	if (!id.value || !student.value) return
	const current = getSelectedSubjectId()
	if (current === subjectId) return
	updateStudent(id.value, {
		reportSelection: {
			...student.value.reportSelection,
			categories: student.value.reportSelection?.categories ?? {},
			selectedSubjectId: subjectId,
		},
	})
}

function setGrade(categoryId: string, category: Category, grade: Grade) {
	if (!id.value || !student.value) return
	const currentEntry = getCategoryEntry(category)
	if (currentEntry.gradeId === grade.id) {
		focusedCategoryId.value = categoryId
		return
	}
	const firstVariantIds = getDefaultVariantIdsForGrade(grade)
	const next = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: grade.id,
			variantIds: firstVariantIds,
			optionalPartOverrides: getOptionalPartOverrides(categoryId),
			namePartOverrides: getNamePartOverrides(categoryId),
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: next },
	})
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value =
		firstVariantIds.length > 0
			? (firstVariantIds[0] ?? null)
			: null
}

function toggleVariant(categoryId: string, category: Category, variantId: string) {
	if (!id.value || !student.value) return
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const grade = category.grades.find((g) => g.id === entry.gradeId)
	if (!grade) return
	const current = entry.variantIds
	const isRemoving = current.includes(variantId)
	if (isRemoving && current.length === 1) {
		focusedCategoryId.value = categoryId
		return
	}
	const next = isRemoving
		? current.filter((i) => i !== variantId)
		: ensureVariantIdsForGrade(grade, [...current, variantId])
	const nextCategories = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: entry.gradeId,
			variantIds: next,
			optionalPartOverrides: getOptionalPartOverrides(categoryId),
			namePartOverrides: getNamePartOverrides(categoryId),
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: nextCategories },
	})
	focusedCategoryId.value = categoryId
	if (next.includes(variantId)) {
		lastChangedVariantId.value = variantId
	} else if (lastChangedVariantId.value === variantId) {
		lastChangedVariantId.value = next.length > 0 ? (next[0] ?? null) : null
	}
}

function selectVariants(categoryId: string, category: Category, variantIds: string[]) {
	if (!id.value || !student.value) return
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const grade = category.grades.find((g) => g.id === entry.gradeId)
	if (!grade) return
	const nextVariantIds = ensureVariantIdsForGrade(grade, variantIds)
	const nextCategories = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: entry.gradeId,
			variantIds: nextVariantIds,
			optionalPartOverrides: getOptionalPartOverrides(categoryId),
			namePartOverrides: getNamePartOverrides(categoryId),
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: nextCategories },
	})
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value =
		nextVariantIds.length > 0
			? (nextVariantIds[nextVariantIds.length - 1] ?? null)
			: null
}

function selectAllVariants(categoryId: string, category: Category) {
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const grade = category.grades.find((g) => g.id === entry.gradeId)
	if (!grade?.variants.length) return
	selectVariants(categoryId, category, grade.variants.map((v) => v.id))
}

function clearAllVariants(categoryId: string, category: Category) {
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const grade = category.grades.find((g) => g.id === entry.gradeId)
	if (!grade) return
	selectVariants(categoryId, category, getDefaultVariantIdsForGrade(grade))
}

function disableCategory(categoryId: string) {
	if (!id.value || !student.value) return
	const nextCategories = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: null,
			variantIds: [],
			optionalPartOverrides: getOptionalPartOverrides(categoryId),
			namePartOverrides: getNamePartOverrides(categoryId),
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: nextCategories },
	})
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value = null
}

function focusCategory(categoryId: string) {
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value = null
}

function toggleOptionalPart(
	categoryId: string,
	category: Category,
	variantId: string,
	partId: string,
	enabled: boolean
) {
	if (!id.value || !student.value) return
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const nextCategories = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: entry.gradeId,
			variantIds: entry.variantIds,
			optionalPartOverrides: {
				...getOptionalPartOverrides(categoryId),
				[partId]: enabled,
			},
			namePartOverrides: getNamePartOverrides(categoryId),
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: nextCategories },
	})
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value = variantId
}

function setNamePartReplacement(
	categoryId: string,
	category: Category,
	variantId: string,
	partIndex: number,
	replacementKey: NamePartReplacementKey | null
) {
	if (!id.value || !student.value) return
	const entry = getCategoryEntry(category)
	if (!entry.gradeId) return
	const nextNamePartOverrides = { ...getNamePartOverrides(categoryId) }
	const key = namePartOverrideKey(variantId, partIndex)
	if (replacementKey) {
		nextNamePartOverrides[key] = replacementKey
	} else {
		delete nextNamePartOverrides[key]
	}
	const nextCategories = {
		...student.value.reportSelection?.categories,
		[categoryId]: {
			gradeId: entry.gradeId,
			variantIds: entry.variantIds,
			optionalPartOverrides: getOptionalPartOverrides(categoryId),
			namePartOverrides: nextNamePartOverrides,
		},
	}
	updateStudent(id.value, {
		reportSelection: { ...student.value.reportSelection, categories: nextCategories },
	})
	focusedCategoryId.value = categoryId
	lastChangedVariantId.value = variantId
}

function openTextOutput() {
	mobileTextOutputOpen.value = true
}

const subjectGroups = computed<SubjectGroup[]>(() => {
	const set = templateSetForReport.value
	const s = student.value
	if (!set || !s) return []
	return set.subjects.map((subject) => {
		const categories: CategoryRow[] = subject.categories.map((category) => {
			const entry = getCategoryEntry(category)
			const grade = entry.gradeId
				? category.grades.find((g) => g.id === entry.gradeId)
				: undefined
			const selectedVariants = (grade?.variants ?? []).filter((variant) =>
				entry.variantIds.includes(variant.id)
			)
			const optionalPartOverrides = getOptionalPartOverrides(category.id)
			const namePartOverrides = getNamePartOverrides(category.id)
			return {
				subjectLabel: subject.label || 'Unbenannt',
				categoryId: category.id,
				categoryLabel: category.label || 'Unbenannt',
				category,
				grades: category.grades,
				selectedGradeId: entry.gradeId,
				selectedVariantIds: entry.variantIds,
				optionalPartOverrides,
				namePartOverrides,
				variants: grade?.variants ?? [],
				selectedPreviewText: buildVariantsPreviewText(
					s,
					selectedVariants,
					optionalPartOverrides,
					namePartOverrides
				),
				variantPreviewById: Object.fromEntries(
					(grade?.variants ?? []).map((variant) => [
						variant.id,
						buildVariantPreviewText(
							s,
							variant,
							optionalPartOverrides,
							namePartOverrides
						),
					])
				),
			}
		})
		return {
			subjectLabel: subject.label || 'Unbenannt',
			subjectId: subject.id,
			categories,
		}
	})
})

const selectedCategoryCount = computed(() =>
	subjectGroups.value.reduce(
		(total, group) =>
			total + group.categories.filter((category) => category.selectedGradeId).length,
		0
	)
)

const totalCategoryCount = computed(() =>
	subjectGroups.value.reduce((total, group) => total + group.categories.length, 0)
)

const mobileOutputStatus = computed(() => {
	if (hasTextOutput.value) {
		return `${reportSegments.value.length} Textbausteine bereit zum Kopieren.`
	}
	if (selectedCategoryCount.value > 0) {
		return 'Auswahl begonnen, aber noch kein Text verfügbar.'
	}
	return 'Noch keine Kategorie aktiv. Wähle zuerst eine Stufe.'
})

const deleteModalOpen = ref(false)
const enhanceModalOpen = ref(false)
const mobileTextOutputOpen = ref(false)

const yearTabItems = computed(() =>
	setsWithData.value.map((setItem) => ({ label: setItem.label, value: setItem.id }))
)

function onFieldUpdate(field: keyof Omit<Student, 'id'>, value: string) {
	if (!id.value) return
	updateStudent(id.value, { [field]: value })
}

function onEnhanceWithAI() {
	enhanceModalOpen.value = true
	rewriter.enhance(textOutputContent.value)
}

function closeEnhanceModal() {
	rewriter.reset()
	enhanceModalOpen.value = false
}

async function confirmDeleteStudent() {
	const studentId = id.value
	if (!studentId || !student.value) return
	isDeletingStudent.value = true
	deleteModalOpen.value = false
	await nextTick()
	deleteStudent(studentId)
	await router.replace('/app/students')
}

watch(enhanceModalOpen, (open) => {
	if (!open) rewriter.reset()
})

watch(
	[subjectGroups, student, id],
	([groups, currentStudent]) => {
		if (!currentStudent) return
		const subjectIds = groups.map((group) => group.subjectId)
		if (!subjectIds.length) return
		const selectedSubjectId = currentStudent.reportSelection?.selectedSubjectId
		if (selectedSubjectId && subjectIds.includes(selectedSubjectId)) return
		const fallbackSubjectId = subjectIds[0]
		if (!fallbackSubjectId) return
		updateStudent(currentStudent.id, {
			reportSelection: {
				...currentStudent.reportSelection,
				categories: currentStudent.reportSelection?.categories ?? {},
				selectedSubjectId: fallbackSubjectId,
			},
		})
	},
	{ immediate: true }
)
</script>

<template>
	<UDashboardPanel id="students-list" resizable class="min-h-0">
		<template #header>
			<UDashboardNavbar :title="student ? studentFullName(student) : 'Schüler bearbeiten'">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton
						v-if="student"
						label="Löschen"
						icon="i-lucide-trash-2"
						color="error"
						variant="ghost"
						aria-label="Schüler löschen"
						@click="deleteModalOpen = true"
					/>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<AppStateNotice
				v-if="!isLoaded"
				title="Schüler wird geladen"
				icon="i-lucide-loader-2"
				loading
			/>
			<StorageLoadErrorAlert v-else-if="loadError" />
			<AppStateNotice
				v-else-if="!student"
				title="Schüler nicht gefunden"
				description="Der Datensatz ist nicht mehr vorhanden oder konnte nicht geladen werden."
				icon="i-lucide-user-x"
			>
				<UButton
					label="Zurück zur Schülerliste"
					to="/app/students"
					icon="i-lucide-users"
					color="neutral"
					variant="outline"
				/>
			</AppStateNotice>
			<div v-else class="flex h-full min-h-0 flex-col gap-4">
				<div class="flex shrink-0 flex-col gap-4">
					<StudentForm
						:student="student"
						:year-tab-items="yearTabItems"
						:effective-template-set-id="effectiveTemplateSetId"
						:grade-average-summary="gradeAverageSummary"
						@update="onFieldUpdate"
					/>

					<AppStateNotice
						v-if="!effectiveTemplateSetId"
						title="Keine passende Vorlage gefunden"
						description="Wähle oben einen vorhandenen Vorlagensatz aus oder lege zuerst neue Vorlagen an."
						icon="i-lucide-file-text"
						tone="primary"
					>
						<UButton
							label="Zu Vorlagen"
							to="/app/templates"
							icon="i-lucide-file-text"
						/>
					</AppStateNotice>
				</div>

				<SentenceSelector
					v-if="hasSelectionWorkspace"
					class="min-h-0 flex-1"
					:subject-groups="subjectGroups"
					:focused-category-id="focusedCategoryId"
					:selected-subject-id="student.reportSelection?.selectedSubjectId ?? null"
					:student-name="student.name"
					:student-gender="student.gender"
					@focus-category="focusCategory"
					@set-grade="setGrade"
					@disable-category="disableCategory"
					@toggle-variant="toggleVariant"
					@toggle-optional-part="toggleOptionalPart"
					@set-name-part-replacement="setNamePartReplacement"
					@select-all-variants="selectAllVariants"
					@clear-all-variants="clearAllVariants"
					@update:selected-subject-id="setSelectedSubjectId"
				/>

				<div
					v-if="hasSelectionWorkspace"
					class="grid shrink-0 grid-cols-2 gap-2 rounded-lg border border-default bg-default/95 p-3 backdrop-blur lg:hidden"
				>
					<div class="col-span-2 rounded-md bg-elevated/50 px-3 py-2 text-xs text-muted">
						<div class="font-medium text-default">
							{{ selectedCategoryCount }}/{{ totalCategoryCount }} Kategorien aktiv
						</div>
						<div>{{ mobileOutputStatus }}</div>
					</div>
					<UButton
						label="Vorschau"
						icon="i-lucide-file-text"
						class="col-span-2"
						@click="openTextOutput"
					/>
					<UButton
						label="Kopieren"
						icon="i-lucide-copy"
						color="neutral"
						variant="outline"
						:disabled="!hasTextOutput"
						@click="copyToClipboard(textOutputContent)"
					/>
					<!--
					<UButton
						v-if="rewriter.isAvailable.value"
						label="Mit KI verbessern"
						icon="i-lucide-sparkles"
						color="neutral"
						variant="outline"
						:disabled="!hasTextOutput"
						@click="onEnhanceWithAI"
					/>
					-->
				</div>
			</div>
		</template>
	</UDashboardPanel>

	<UDashboardPanel id="students-detail" class="hidden min-h-0 lg:flex">
		<template #header>
			<UDashboardNavbar title="Textausgabe">
				<template #right>
					<UButton
						label="Kopieren"
						icon="i-lucide-copy"
						color="neutral"
						variant="ghost"
						aria-label="Textausgabe in Zwischenablage kopieren"
						:disabled="!hasTextOutput"
						@click="copyToClipboard(textOutputContent)"
					/>
					<!--
					<UButton
						v-if="rewriter.isAvailable.value"
						label="Mit KI verbessern"
						icon="i-lucide-sparkles"
						color="neutral"
						variant="ghost"
						aria-label="Text mit KI verbessern"
						@click="onEnhanceWithAI"
					/>
					-->
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<TextOutputPanel
				:segments="reportSegments"
				:focused-category-id="focusedCategoryId"
				:highlighted-variant-id="lastChangedVariantId"
			/>
		</template>
	</UDashboardPanel>

	<UModal
		v-model:open="deleteModalOpen"
		title="Schüler löschen"
		:description="
			student
				? `Möchtest du ${studentFullName(student)} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
				: ''
		"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Löschen" color="error" @click="confirmDeleteStudent" />
		</template>
	</UModal>

	<USlideover v-model:open="mobileTextOutputOpen" title="Textausgabe" class="lg:hidden">
		<template #body>
			<div class="flex flex-col gap-3 p-4">
				<div class="flex gap-2 justify-end">
					<UButton
						label="Kopieren"
						icon="i-lucide-copy"
						color="neutral"
						variant="outline"
						size="sm"
						:disabled="!hasTextOutput"
						@click="copyToClipboard(textOutputContent)"
					/>
					<!--
					<UButton
						v-if="rewriter.isAvailable.value"
						label="Mit KI verbessern"
						icon="i-lucide-sparkles"
						color="neutral"
						variant="outline"
						size="sm"
						@click="onEnhanceWithAI"
					/>
					-->
				</div>
				<TextOutputPanel
					:segments="reportSegments"
					:focused-category-id="focusedCategoryId"
					:highlighted-variant-id="lastChangedVariantId"
				/>
			</div>
		</template>
	</USlideover>

	<AiEnhanceModal
		:open="enhanceModalOpen"
		:phase="rewriter.enhancePhase.value"
		:download-progress="rewriter.enhanceDownloadProgress.value"
		:result="rewriter.enhanceResult.value"
		:error="rewriter.enhanceError.value"
		@update:open="enhanceModalOpen = $event"
		@close="closeEnhanceModal"
		@copy-result="copyToClipboard(rewriter.enhanceResult.value)"
	/>
</template>
