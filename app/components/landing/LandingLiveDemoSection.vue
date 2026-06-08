<script setup lang="ts">
import { landingAnchorIds, landingDemoTabs } from '~/data/landingContent'

const demoTab = ref('report')
</script>

<template>
	<UPageSection
		:id="landingAnchorIds.demo"
		headline="Live-Demo"
		title="Probiere es aus"
		description="Kein Login nötig — wähle Noten und Formulierungen und sieh den Zeugnistext live entstehen."
	>
		<UCard variant="subtle" class="overflow-hidden">
			<UTabs
				v-model="demoTab"
				:items="landingDemoTabs"
				class="w-full"
				:ui="{ list: 'border-b border-default px-4 pt-2', content: 'p-4 sm:p-6' }"
			>
				<template #report>
					<LandingReportDemo />
				</template>
				<template #sentences>
					<LandingSentenceCreateDemo />
				</template>
			</UTabs>
		</UCard>
	</UPageSection>
</template>
