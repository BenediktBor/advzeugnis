<script setup lang="ts">
import { useLandingDemoContext } from '~/composables/useLandingDemoContext'

const demo = useLandingDemoContext()

const student = computed(() => demo.student.value)
const subjectGroups = computed(() => demo.subjectGroups.value)
const reportSegments = computed(() => demo.reportSegments.value)
const focusedCategoryId = computed(() => demo.focusedCategoryId.value)
const highlightedVariantId = computed(() => demo.highlightedVariantId.value)
const expandedCategoryIds = computed(() => demo.expandedCategoryIds.value)
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-2 lg:gap-8 min-h-[420px]">
		<div class="flex flex-col gap-4 min-h-0">
			<LandingDemoStudentControls />

			<SentenceSelector
				class="min-h-0 flex-1"
				:subject-groups="subjectGroups"
				:focused-category-id="focusedCategoryId"
				:selected-subject-id="student.reportSelection?.selectedSubjectId ?? null"
				:expanded-category-ids="expandedCategoryIds"
				:student-name="student.name"
				:student-gender="student.gender"
				@focus-category="demo.focusCategory"
				@set-grade="demo.setGrade"
				@disable-category="demo.disableCategory"
				@toggle-variant="demo.toggleVariant"
				@toggle-optional-part="demo.toggleOptionalPart"
				@set-name-part-replacement="demo.setNamePartReplacement"
				@select-all-variants="demo.selectAllVariants"
				@clear-all-variants="demo.clearAllVariants"
				@update:selected-subject-id="demo.setSelectedSubjectId"
				@update:expanded-category-ids="demo.setExpandedCategoryIds"
			/>
		</div>

		<TextOutputPanel
			class="min-h-[280px] lg:min-h-0"
			:segments="reportSegments"
			:focused-category-id="focusedCategoryId"
			:highlighted-variant-id="highlightedVariantId"
		/>
	</div>
</template>
