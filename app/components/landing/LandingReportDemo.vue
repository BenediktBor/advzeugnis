<script setup lang="ts">
import { useLandingDemoContext } from '~/composables/useLandingDemoContext'

const demo = useLandingDemoContext()
const { copyToClipboard } = useClipboardCopy()

const student = computed(() => demo.student.value)
const subjectGroups = computed(() => demo.subjectGroups.value)
const reportSegments = computed(() => demo.reportSegments.value)
const reportPlainText = computed(() => demo.reportPlainText.value)
const focusedCategoryId = computed(() => demo.focusedCategoryId.value)
const highlightedVariantId = computed(() => demo.highlightedVariantId.value)
const expandedCategoryIds = computed(() => demo.expandedCategoryIds.value)

const hasTextOutput = computed(() => reportPlainText.value.trim().length > 0)
</script>

<template>
	<div
		class="flex flex-col gap-6 lg:grid lg:min-h-[420px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8"
	>
		<div class="flex min-h-0 min-w-0 flex-col gap-4">
			<LandingDemoStudentControls />

			<SentenceSelector
				class="min-h-0 max-h-[min(70vh,640px)] flex-1 lg:max-h-none"
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
				@set-input-part-value="demo.setInputPartValue"
				@select-all-variants="demo.selectAllVariants"
				@clear-all-variants="demo.clearAllVariants"
				@update:selected-subject-id="demo.setSelectedSubjectId"
				@update:expanded-category-ids="demo.setExpandedCategoryIds"
			/>
		</div>

		<div class="min-w-0 border-t border-default pt-4 lg:border-t-0 lg:pt-0">
			<TextOutputPanel
				class="min-h-[200px] lg:min-h-0"
				label-icon="i-lucide-file-text"
				:segments="reportSegments"
				:focused-category-id="focusedCategoryId"
				:highlighted-variant-id="highlightedVariantId"
			>
				<template #actions>
					<UButton
						label="Kopieren"
						icon="i-lucide-copy"
						color="neutral"
						variant="outline"
						size="sm"
						aria-label="Textausgabe in Zwischenablage kopieren"
						:disabled="!hasTextOutput"
						@click="copyToClipboard(reportPlainText)"
					/>
				</template>
			</TextOutputPanel>
		</div>
	</div>
</template>
