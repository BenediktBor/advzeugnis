<script setup lang="ts">
const route = useRoute()
const { isLoaded, hasSchool, canEditTemplates } = useCurrentUser()

const deniedTitle = computed(() => {
	if (!isLoaded.value) return 'Berechtigungen werden geladen'
	return hasSchool.value ? 'Keine Berechtigung' : 'Schule erforderlich'
})

const deniedDescription = computed(() => {
	if (!isLoaded.value) return undefined
	return hasSchool.value
		? 'Nur Admins und Template Manager können die Vorlagenverwaltung öffnen.'
		: 'Richte zuerst deine Schule ein, bevor du Vorlagen anlegst oder bearbeitest.'
})

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
				:title="deniedTitle"
				:description="deniedDescription"
				:icon="isLoaded ? 'i-lucide-lock' : 'i-lucide-loader-2'"
				:loading="!isLoaded"
			>
				<UButton
					v-if="isLoaded && !hasSchool"
					label="Schule einrichten"
					to="/app/setup-school"
					icon="i-lucide-building-2"
				/>
			</AppStateNotice>
		</template>
	</UDashboardPanel>
</template>
