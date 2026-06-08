<script setup lang="ts">
import { useLandingDemoContext } from '~/composables/useLandingDemoContext'
import { landingAnchorIds } from '~/data/landingContent'

const demo = useLandingDemoContext()

const studentDisplayName = computed(() => demo.studentDisplayName.value)
const reportPlainText = computed(() => demo.reportPlainText.value)
const coverageSummary = computed(() => demo.coverageSummary.value)
</script>

<template>
	<UPageCard spotlight spotlight-color="primary" class="w-full">
		<div class="flex flex-col gap-4 p-2">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-sm font-medium text-highlighted">
					<UIcon name="i-lucide-user" class="size-4 text-primary" />
					{{ studentDisplayName }}
				</div>
				<CategoryProgressCircle
					:value="coverageSummary.completed"
					:total="coverageSummary.total"
					label="Fortschritt"
					:tone="coverageSummary.isFinished ? 'success' : 'primary'"
				/>
			</div>
			<div
				class="rounded-md border border-default bg-default px-3 py-2 text-sm leading-relaxed text-default min-h-[80px]"
			>
				<template v-if="reportPlainText">
					{{ reportPlainText }}
				</template>
				<span v-else class="text-muted">
					Wähle in der Demo unten Kategorien aus …
				</span>
			</div>
			<UButton
				label="Zur Live-Demo"
				:to="`#${landingAnchorIds.demo}`"
				icon="i-lucide-play"
				block
				variant="soft"
			/>
		</div>
	</UPageCard>
</template>
