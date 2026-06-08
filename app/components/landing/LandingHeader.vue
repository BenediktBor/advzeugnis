<script setup lang="ts">
import { landingNavItems, SHOW_LANDING_PRICING } from '~/data/landingContent'

const navItems = computed(() => landingNavItems(SHOW_LANDING_PRICING))
</script>

<template>
	<UHeader>
		<template #title>
			<LandingBrandLink />
		</template>

		<UNavigationMenu :items="navItems" class="hidden lg:flex" />

		<template #body>
			<UNavigationMenu
				:items="navItems"
				orientation="vertical"
				class="px-4"
			/>
		</template>

		<template #right>
			<UButton
				to="/sign-in"
				label="Anmelden"
				trailing-icon="i-lucide-arrow-right"
				class="hidden sm:inline-flex"
			/>
		</template>
	</UHeader>
</template>
