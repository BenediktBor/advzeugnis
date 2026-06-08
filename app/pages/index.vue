<script setup lang="ts">
import {
	landingAnchorIds,
	landingCtaLinks,
	landingFeatures,
	landingHeroLinks,
} from '~/data/landingContent'
</script>

<template>
	<div>
		<LandingHeader />

		<LandingDemoScope>
			<UPageHero
				title="Zeugnisse in Minuten statt Stunden"
				description="Schüler verwalten, Satzvorlagen bearbeiten und Zeugnisse effizient erstellen — solo oder im Schulteam."
				orientation="horizontal"
				:links="landingHeroLinks"
			>
				<template #headline>
					<div class="flex flex-col items-start gap-4">
						<div class="flex items-center gap-2.5">
							<AppBrandIcon class="size-8" />
							<span class="text-xl font-semibold text-highlighted">AdvancedZeugnis</span>
						</div>
						<span class="font-semibold text-primary">Für Lehrkräfte</span>
					</div>
				</template>

				<LandingDemoPreviewCard />
			</UPageHero>

			<LandingLiveDemoSection />
		</LandingDemoScope>

		<UPageSection
			:id="landingAnchorIds.features"
			headline="Funktionen"
			title="Alles für effiziente Zeugnisse"
			description="AdvancedZeugnis verbindet wiederverwendbare Satzvorlagen mit schneller Schülerauswahl und Live-Vorschau."
			:features="landingFeatures"
		/>

		<LandingWorkflowSection />

		<UPageSection>
			<UPageCTA
				title="Bereit für das nächste Zeugnis?"
				description="Registriere dich kostenlos und starte mit deinen ersten Schülern und Vorlagen."
				variant="subtle"
				:links="landingCtaLinks"
			/>
		</UPageSection>

		<LandingFooter />
	</div>
</template>
