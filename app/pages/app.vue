<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const { isLoaded, isAuthenticated } = useCurrentUser()
const isAuthorized = computed(() => isLoaded.value && isAuthenticated.value)

watchEffect(() => {
	if (!import.meta.client) return
	if (!isLoaded.value) return
	if (isAuthenticated.value) return
	void navigateTo({
		path: '/sign-in',
		query: { redirect: route.fullPath },
	}, { replace: true })
})
</script>

<template>
	<NuxtPage v-if="isAuthorized" />
	<UDashboardPanel v-else>
		<template #body>
			<AppStateNotice
				title="Anmeldung erforderlich"
				description="Du wirst zur Anmeldung weitergeleitet."
				icon="i-lucide-lock"
				loading
			/>
		</template>
	</UDashboardPanel>
</template>
