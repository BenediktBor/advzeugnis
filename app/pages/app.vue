<script setup lang="ts">
import { getStoredAuthToken } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const { isLoaded, isAuthenticated, authError } = useCurrentUser()

const hasStoredToken = computed(
	() => import.meta.client && Boolean(getStoredAuthToken()),
)

const isCheckingAuth = computed(() => {
	if (!import.meta.client) return true
	if (!hasStoredToken.value) return false
	return !isLoaded.value
})

watchEffect(() => {
	if (!import.meta.client) return
	if (isCheckingAuth.value) return
	if (isAuthenticated.value) return
	void navigateTo({
		path: '/sign-in',
		query: { redirect: route.fullPath },
	}, { replace: true })
})
</script>

<template>
	<NuxtPage v-if="isAuthenticated" />
	<UDashboardPanel v-else>
		<template #body>
			<AppStateNotice
				v-if="authError"
				title="Anmeldung konnte nicht geprüft werden"
				:description="authError.message"
				icon="i-lucide-alert-circle"
				tone="error"
			/>
			<AppStateNotice
				v-else
				title="Anmeldung erforderlich"
				description="Du wirst zur Anmeldung weitergeleitet."
				icon="i-lucide-lock"
				:loading="isCheckingAuth"
			/>
		</template>
	</UDashboardPanel>
</template>
