<script setup lang="ts">
const route = useRoute()
const { isLoaded, hasSchool } = useCurrentUser()

watch(
	[isLoaded, hasSchool],
	([loaded, school]) => {
		if (!loaded || school) return
		void navigateTo({
			path: '/app/setup-school',
			query: { from: route.fullPath },
		}, { replace: true })
	},
	{ immediate: true },
)
</script>

<template>
	<NuxtPage v-if="hasSchool" />
	<UDashboardPanel v-else>
		<template #body>
			<AppStateNotice
				:title="isLoaded ? 'Schule erforderlich' : 'Berechtigungen werden geladen'"
				:description="isLoaded ? 'Richte zuerst deine Schule ein, bevor du Schüler anlegst oder bearbeitest.' : undefined"
				:icon="isLoaded ? 'i-lucide-building-2' : 'i-lucide-loader-2'"
				:loading="!isLoaded"
				tone="primary"
			>
				<UButton
					v-if="isLoaded"
					label="Schule einrichten"
					to="/app/setup-school"
					icon="i-lucide-building-2"
				/>
			</AppStateNotice>
		</template>
	</UDashboardPanel>
</template>
