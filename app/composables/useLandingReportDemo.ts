import type { NamePartReplacementKey } from '~/types/student'
import type { Student } from '~/types/student'
import type { Category, Grade, TemplateSet } from '~/types/template'
import type { SubjectGroup, CategoryRow } from '~/components/SentenceSelector.vue'
import {
	buildVariantPreviewText,
	buildVariantsPreviewText,
	buildReportPlainText,
	buildReportSegments,
	buildSelectionCoverageSummary,
	ensureVariantIdsForGrade,
	getDefaultVariantIdsForGrade,
	getEffectiveCategoryEntry,
	namePartOverrideKey,
	type ReportSegment,
} from '~/utils/reportText'
import { studentFullName } from '~/utils/student'

export function useLandingReportDemo(
	templateSet: TemplateSet,
	initialStudent: Student
) {
	const student = ref<Student>(structuredClone(initialStudent))
	const focusedCategoryId = ref<string | null>(null)
	const lastChangedVariantId = ref<string | null>(null)

	function getCategoryEntry(category: Category) {
		const s = student.value
		const entry = getEffectiveCategoryEntry(s, category)
		if (!entry) return { gradeId: null as string | null, variantIds: [] as string[] }
		return entry
	}

	function getStoredCategoryEntry(categoryId: string) {
		return student.value.reportSelection?.categories?.[categoryId]
	}

	function getOptionalPartOverrides(categoryId: string) {
		return getStoredCategoryEntry(categoryId)?.optionalPartOverrides ?? {}
	}

	function getNamePartOverrides(categoryId: string) {
		return getStoredCategoryEntry(categoryId)?.namePartOverrides ?? {}
	}

	function getInputPartOverrides(categoryId: string) {
		return getStoredCategoryEntry(categoryId)?.inputPartOverrides ?? {}
	}

	function getSelectPartOverrides(categoryId: string) {
		return getStoredCategoryEntry(categoryId)?.selectPartOverrides ?? {}
	}

	function getSelectedSubjectId() {
		return student.value.reportSelection?.selectedSubjectId ?? null
	}

	function patchReportSelection(
		patch: Partial<NonNullable<Student['reportSelection']>>
	) {
		student.value = {
			...student.value,
			reportSelection: {
				...student.value.reportSelection,
				categories: student.value.reportSelection?.categories ?? {},
				...patch,
			},
		}
	}

	function setSelectedSubjectId(subjectId: string) {
		if (getSelectedSubjectId() === subjectId) return
		patchReportSelection({ selectedSubjectId: subjectId })
	}

	function sameExpandedCategoryIds(a: string[], b: string[]): boolean {
		if (a.length !== b.length) return false
		const sortedA = [...a].sort()
		const sortedB = [...b].sort()
		return sortedA.every((v, i) => v === sortedB[i])
	}

	function setExpandedCategoryIds(expandedIds: string[]) {
		const current = student.value.reportSelection?.expandedCategoryIds ?? []
		if (sameExpandedCategoryIds(current, expandedIds)) return
		patchReportSelection({ expandedCategoryIds: expandedIds })
	}

	function setGrade(categoryId: string, category: Category, grade: Grade) {
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
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: next })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = firstVariantIds[0] ?? null
	}

	function toggleVariant(categoryId: string, category: Category, variantId: string) {
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
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		if (next.includes(variantId)) {
			lastChangedVariantId.value = variantId
		} else if (lastChangedVariantId.value === variantId) {
			lastChangedVariantId.value = next[0] ?? null
		}
	}

	function selectVariants(categoryId: string, category: Category, variantIds: string[]) {
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
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = nextVariantIds[nextVariantIds.length - 1] ?? null
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
		const nextCategories = {
			...student.value.reportSelection?.categories,
			[categoryId]: {
				gradeId: null,
				variantIds: [],
				optionalPartOverrides: getOptionalPartOverrides(categoryId),
				namePartOverrides: getNamePartOverrides(categoryId),
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
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
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = variantId
	}

	function setNamePartReplacement(
		categoryId: string,
		category: Category,
		variantId: string,
		partPath: string,
		replacementKey: NamePartReplacementKey | null
	) {
		const entry = getCategoryEntry(category)
		if (!entry.gradeId) return
		const nextNamePartOverrides = { ...getNamePartOverrides(categoryId) }
		const key = namePartOverrideKey(variantId, partPath)
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
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = variantId
	}

	function setInputPartValue(
		categoryId: string,
		category: Category,
		variantId: string,
		partPath: string,
		value: string
	) {
		const entry = getCategoryEntry(category)
		if (!entry.gradeId) return
		const nextInputPartOverrides = { ...getInputPartOverrides(categoryId) }
		const key = namePartOverrideKey(variantId, partPath)
		const trimmed = value.trim()
		if (trimmed) {
			nextInputPartOverrides[key] = trimmed
		} else {
			delete nextInputPartOverrides[key]
		}
		const nextCategories = {
			...student.value.reportSelection?.categories,
			[categoryId]: {
				gradeId: entry.gradeId,
				variantIds: entry.variantIds,
				optionalPartOverrides: getOptionalPartOverrides(categoryId),
				namePartOverrides: getNamePartOverrides(categoryId),
				inputPartOverrides: nextInputPartOverrides,
				selectPartOverrides: getSelectPartOverrides(categoryId),
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = variantId
	}

	function setSelectPartValue(
		categoryId: string,
		category: Category,
		variantId: string,
		partPath: string,
		value: string
	) {
		const entry = getCategoryEntry(category)
		if (!entry.gradeId) return
		const nextSelectPartOverrides = { ...getSelectPartOverrides(categoryId) }
		const key = namePartOverrideKey(variantId, partPath)
		const trimmed = value.trim()
		if (trimmed) {
			nextSelectPartOverrides[key] = trimmed
		} else {
			delete nextSelectPartOverrides[key]
		}
		const nextCategories = {
			...student.value.reportSelection?.categories,
			[categoryId]: {
				gradeId: entry.gradeId,
				variantIds: entry.variantIds,
				optionalPartOverrides: getOptionalPartOverrides(categoryId),
				namePartOverrides: getNamePartOverrides(categoryId),
				inputPartOverrides: getInputPartOverrides(categoryId),
				selectPartOverrides: nextSelectPartOverrides,
			},
		}
		patchReportSelection({ categories: nextCategories })
		focusedCategoryId.value = categoryId
		lastChangedVariantId.value = variantId
	}

	function setStudentGender(gender: 'male' | 'female') {
		student.value = { ...student.value, gender }
	}

	function setStudentName(name: string) {
		student.value = { ...student.value, name }
	}

	const subjectGroups = computed<SubjectGroup[]>(() => {
		const s = student.value
		return templateSet.subjects.map((subject) => {
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
				const inputPartOverrides = getInputPartOverrides(category.id)
				const selectPartOverrides = getSelectPartOverrides(category.id)
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
					inputPartOverrides,
					selectPartOverrides,
					variants: grade?.variants ?? [],
					selectedPreviewText: buildVariantsPreviewText(
						s,
						selectedVariants,
						optionalPartOverrides,
						namePartOverrides,
						inputPartOverrides,
						selectPartOverrides
					),
					variantPreviewById: Object.fromEntries(
						(grade?.variants ?? []).map((variant) => [
							variant.id,
							buildVariantPreviewText(
								s,
								variant,
								optionalPartOverrides,
								namePartOverrides,
								inputPartOverrides,
								selectPartOverrides
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

	const reportSegments = computed<ReportSegment[]>(() =>
		buildReportSegments(student.value, templateSet)
	)

	const reportPlainText = computed(() =>
		buildReportPlainText(student.value, templateSet)
	)

	const coverageSummary = computed(() =>
		buildSelectionCoverageSummary(student.value, templateSet)
	)

	const studentDisplayName = computed(() => studentFullName(student.value))

	const expandedCategoryIds = computed(
		() => student.value.reportSelection?.expandedCategoryIds ?? []
	)

	watch(
		[subjectGroups, student],
		([groups]) => {
			const subjectIds = groups.map((group) => group.subjectId)
			if (!subjectIds.length) return
			const selectedSubjectId = student.value.reportSelection?.selectedSubjectId
			if (selectedSubjectId && subjectIds.includes(selectedSubjectId)) return
			const fallbackSubjectId = subjectIds[0]
			if (!fallbackSubjectId) return
			patchReportSelection({ selectedSubjectId: fallbackSubjectId })
		},
		{ immediate: true }
	)

	return {
		student,
		subjectGroups,
		reportSegments,
		reportPlainText,
		coverageSummary,
		studentDisplayName,
		focusedCategoryId,
		highlightedVariantId: lastChangedVariantId,
		expandedCategoryIds,
		setSelectedSubjectId,
		setExpandedCategoryIds,
		setGrade,
		toggleVariant,
		selectAllVariants,
		clearAllVariants,
		disableCategory,
		focusCategory,
		toggleOptionalPart,
		setNamePartReplacement,
		setInputPartValue,
		setSelectPartValue,
		setStudentGender,
		setStudentName,
	}
}

export type LandingReportDemo = ReturnType<typeof useLandingReportDemo>
