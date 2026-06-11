<script setup lang="ts">
import { AUTH_SESSION_WAIT_MS, clearStaleAuthSession } from '~/utils/authSession'
import { getStoredAuthToken, isWithinTokenGracePeriod } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const { isLoaded, isAuthenticated, authError } = useCurrentUser()

let hasRedirectedToSignIn = false
let authCheckTimeout: ReturnType<typeof setTimeout> | null = null
let authWaitDeadlineScheduled = false

const isCheckingAuth = computed(() => {
	if (!import.meta.client || hasRedirectedToSignIn) return false
	if (isAuthenticated.value) return false
	if (!isLoaded.value) return true
	return isWithinTokenGracePeriod()
})

function redirectToSignIn(options?: { sessionExpired?: boolean }) {
	if (hasRedirectedToSignIn) return
	hasRedirectedToSignIn = true

	void navigateTo({
		path: '/sign-in',
		query: {
			redirect: route.fullPath,
			...(options?.sessionExpired ? { sessionExpired: '1' } : {}),
		},
	}, { replace: true })
}

function handleUnauthenticatedSession() {
	if (!import.meta.client || hasRedirectedToSignIn) return
	if (!isLoaded.value || isAuthenticated.value) return
	if (isWithinTokenGracePeriod()) return

	const hadToken = Boolean(getStoredAuthToken())
	clearStaleAuthSession()
	redirectToSignIn({ sessionExpired: hadToken })
}

function scheduleMonotonicAuthDeadline() {
	if (!import.meta.client || authWaitDeadlineScheduled || hasRedirectedToSignIn) return
	if (isLoaded.value) return

	authWaitDeadlineScheduled = true
	authCheckTimeout = setTimeout(() => {
		if (isAuthenticated.value || hasRedirectedToSignIn) return

		const hadToken = Boolean(getStoredAuthToken())
		clearStaleAuthSession()
		redirectToSignIn({ sessionExpired: hadToken })
	}, AUTH_SESSION_WAIT_MS)
}

watch([isLoaded, isAuthenticated], () => {
	handleUnauthenticatedSession()
}, { immediate: true })

watch(isLoaded, (loaded) => {
	if (loaded || isAuthenticated.value) {
		if (authCheckTimeout) {
			clearTimeout(authCheckTimeout)
			authCheckTimeout = null
		}
		authWaitDeadlineScheduled = false
		return
	}
	scheduleMonotonicAuthDeadline()
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
