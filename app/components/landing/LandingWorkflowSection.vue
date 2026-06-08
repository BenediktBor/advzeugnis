<script setup lang="ts">
import {
	landingAnchorIds,
	landingStepCards,
	landingStepperItems,
	SHOW_LANDING_PRICING,
	landingPricingPlans,
} from '~/data/landingContent'

const activeStep = ref(0)
</script>

<template>
	<UPageSection
		:id="landingAnchorIds.workflow"
		headline="Workflow"
		title="So funktioniert's"
		description="In drei Schritten vom leeren Blatt zum fertigen Zeugnistext."
	>
		<div class="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
			<UStepper
				v-model="activeStep"
				:items="landingStepperItems"
				class="w-full"
			/>
			<UPageCard
				v-if="landingStepCards[activeStep]"
				spotlight
				spotlight-color="primary"
				:icon="landingStepCards[activeStep]!.icon"
				:title="landingStepCards[activeStep]!.title"
				:description="landingStepCards[activeStep]!.description"
			/>
		</div>
	</UPageSection>

	<UPageSection
		v-if="SHOW_LANDING_PRICING"
		:id="landingAnchorIds.pricing"
		headline="Preise"
		title="Der passende Plan für dich"
		description="Wähle den Plan, der zu dir passt — mit oder ohne Team."
	>
		<UPricingPlans
			:plans="landingPricingPlans"
			scale
			class="max-w-4xl mx-auto"
		/>
	</UPageSection>
</template>
