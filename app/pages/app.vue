<script setup lang="ts">
import { useCurrentUserStore } from '~/stores/currentUser'
import { AUTH_SESSION_WAIT_MS, resolveStoredTokenRedirect } from '~/utils/authSession'
import { clearAuthTokens, getStoredAuthToken } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const { isLoaded, isAuthenticated, authError } = useCurrentUser()

const hasStoredToken = computed(
	() => import.meta.client && Boolean(getStoredAuthToken()),
)

const redirectDecision = computed(() => resolveStoredTokenRedirect({
	hasToken: hasStoredToken.value,
	isLoaded: isLoaded.value,
	isAuthenticated: isAuthenticated.value,
}))

const isCheckingAuth = computed(() => {
	if (!import.meta.client) return true
	return redirectDecision.value === 'wait'
})

function redirectToSignIn(options?: { sessionExpired?: boolean }) {
	void navigateTo({
		path: '/sign-in',
		query: {
			redirect: route.fullPath,
			...(options?.sessionExpired ? { sessionExpired: '1' } : {}),
		},
	}, { replace: true })
}

watch(redirectDecision, (decision) => {
	if (!import.meta.client) return
	if (decision === 'clear_and_stay') {
		clearAuthTokens()
		useCurrentUserStore().clearUser()
		redirectToSignIn({ sessionExpired: true })
	}
}, { immediate: true })

let authCheckTimeout: ReturnType<typeof setTimeout> | null = null
let authWaitDeadlineScheduled = false

function scheduleMonotonicAuthDeadline() {
	if (!import.meta.client || !hasStoredToken.value || authWaitDeadlineScheduled) return
	authWaitDeadlineScheduled = true

	authCheckTimeout = setTimeout(() => {
		if (isAuthenticated.value) return
		clearAuthTokens()
		useCurrentUserStore().clearUser()
		redirectToSignIn({ sessionExpired: true })
	}, AUTH_SESSION_WAIT_MS)
}

watch(hasStoredToken, (hasToken) => {
	if (!hasToken) {
		authWaitDeadlineScheduled = false
		if (authCheckTimeout) {
			clearTimeout(authCheckTimeout)
			authCheckTimeout = null
		}
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
