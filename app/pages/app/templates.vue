<script setup lang="ts">
const route = useRoute()
const { isLoaded, canEditTemplates } = useCurrentUser()

watch(
	[isLoaded, canEditTemplates],
	([loaded, canEdit]) => {
		if (!loaded || canEdit) return
		void navigateTo({
			path: '/app',
			query: { denied: 'templates', from: route.fullPath },
		}, { replace: true })
	},
	{ immediate: true },
)
</script>

<template>
	<NuxtPage v-if="canEditTemplates" />
	<UDashboardPanel v-else>
		<template #body>
			<AppStateNotice
				:title="isLoaded ? 'Keine Berechtigung' : 'Berechtigungen werden geladen'"
				:description="isLoaded ? 'Nur Admins und Template Manager können die Vorlagenverwaltung öffnen.' : undefined"
				:icon="isLoaded ? 'i-lucide-lock' : 'i-lucide-loader-2'"
				:loading="!isLoaded"
			/>
		</template>
	</UDashboardPanel>
</template>
