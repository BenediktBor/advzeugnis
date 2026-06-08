<script setup lang="ts">
import { useCurrentUserStore } from '~/stores/currentUser'
import { clearAuthTokens, getStoredAuthToken } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'dashboard' })

const AUTH_CHECK_TIMEOUT_MS = 10_000

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

let authCheckTimeout: ReturnType<typeof setTimeout> | null = null

watch(isCheckingAuth, (checking) => {
	if (authCheckTimeout) {
		clearTimeout(authCheckTimeout)
		authCheckTimeout = null
	}
	if (!checking || !import.meta.client) return

	authCheckTimeout = setTimeout(() => {
		clearAuthTokens()
		useCurrentUserStore().clearUser()
		void navigateTo({
			path: '/sign-in',
			query: { redirect: route.fullPath },
		}, { replace: true })
	}, AUTH_CHECK_TIMEOUT_MS)
}, { immediate: true })

onUnmounted(() => {
	if (authCheckTimeout) clearTimeout(authCheckTimeout)
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
