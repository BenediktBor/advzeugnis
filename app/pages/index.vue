<script setup lang="ts">
import {
	landingAnchorIds,
	landingCtaLinks,
	landingFeatures,
	landingHeroLinks,
} from '~/data/landingContent'

useAppSeo({
	title: 'Zeugnisse in Minuten statt Stunden',
})
</script>

<template>
	<div>
		<LandingHeader />

		<LandingDemoScope>
			<UPageHero
				headline="Für Lehrkräfte"
				title="Zeugnisse in Minuten statt Stunden"
				description="Schüler verwalten, Satzvorlagen bearbeiten und Zeugnisse effizient erstellen — solo oder im Schulteam."
				orientation="horizontal"
				:links="landingHeroLinks"
			>
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
