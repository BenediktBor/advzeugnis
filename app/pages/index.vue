<script setup lang="ts">
const pricingId = 'preise'

const plans = [
	{
		title: 'Solo',
		description: 'Für Einzelnutzer',
		tagline: 'Erste 2 Monate kostenlos',
		price: '1,99 €',
		billingCycle: '/Monat',
		features: [
			'Persönliche Zeugnisverwaltung',
			'Alle Jahrgangs-Vorlagen',
			'Unbegrenzt viele Schüler',
		],
		button: { label: 'Kostenlos testen', to: '/app' },
	},
	{
		title: 'Schule',
		description: 'Für Teams',
		price: 'Auf Anfrage',
		features: [
			'Mehrere Lehrkräfte mit unterschiedlichen Rollen',
			'Zentrale Satzvorlagenverwaltung',
			'Unbegrenzt viele Schüler pro Lehrer',
		],
		button: {
			label: 'Demo ansehen',
			to: '/app',
			color: 'neutral' as const,
			variant: 'outline' as const,
		},
		scale: true,
	},
]
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<!-- Header -->
		<header
			class="sticky top-0 z-10 border-b border-default bg-default/95 backdrop-blur supports-backdrop-filter:bg-default/80"
		>
			<UContainer class="flex h-14 items-center justify-between">
				<ULink
					to="/"
					class="flex items-center gap-2 font-semibold text-highlighted"
				>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-6 text-primary"
					/>
					AdvancedZeugnis
				</ULink>
				<UButton
					to="/app"
					label="Anmelden"
					trailing-icon="i-lucide-arrow-right"
				/>
			</UContainer>
		</header>

		<main class="flex-1">
			<!-- Hero -->
			<UPageHero
				title="AdvancedZeugnis"
				description="Zeugnisverwaltung für Lehrkräfte: Schüler verwalten, Vorlagen bearbeiten und Zeugnisse effizient erstellen – solo oder im Schulteam."
				:links="[
					{
						label: 'Preise ansehen',
						to: `#${pricingId}`,
						color: 'neutral',
						variant: 'outline',
					},
					{ label: 'Kostenlos starten', to: '/app' },
				]"
			/>

			<!-- Pricing -->
			<section
				:id="pricingId"
				class="border-t border-default bg-elevated/30 py-16"
			>
				<UContainer>
					<h2
						class="text-center text-2xl font-semibold text-highlighted mb-2"
					>
						Preise
					</h2>
					<p class="text-center text-muted mb-10 max-w-xl mx-auto">
						Wähle den Plan, der zu dir passt – mit oder ohne Team.
					</p>
					<UPricingPlans
						:plans="plans"
						scale
						class="max-w-4xl mx-auto"
					/>
				</UContainer>
			</section>
		</main>
	</div>
</template>
