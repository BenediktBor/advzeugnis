<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const { signIn, completeSignInFromUrl } = useConvexAuthActions()
const isCompleting = ref(false)
const error = ref('')

const redirectTo = computed(() => {
	const redirect = route.query.redirect
	return Array.isArray(redirect) ? redirect[0] ?? '/app' : redirect ?? '/app'
})

onMounted(async () => {
	if (!window.location.search) return
	isCompleting.value = true
	try {
		const completed = await completeSignInFromUrl()
		if (completed) await router.replace(redirectTo.value)
	} catch (err) {
		console.error('[auth] sign-in callback failed:', err)
		error.value = 'Anmeldung konnte nicht abgeschlossen werden.'
	} finally {
		isCompleting.value = false
	}
})

async function onSignIn() {
	error.value = ''
	try {
		await signIn('google', redirectTo.value)
	} catch (err) {
		console.error('[auth] sign-in failed:', err)
		error.value = 'Anmeldung konnte nicht gestartet werden.'
	}
}
</script>

<template>
	<UContainer class="flex min-h-screen items-center justify-center py-12">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="space-y-1">
					<h1 class="text-xl font-semibold text-highlighted">Anmelden</h1>
					<p class="text-sm text-muted">
						Melde dich mit OAuth an, um Schulvorlagen und Teamfunktionen zu nutzen.
					</p>
				</div>
			</template>

			<div class="flex flex-col gap-4">
				<UAlert
					v-if="error"
					color="error"
					variant="soft"
					:title="error"
				/>
				<UButton
					label="Mit Google anmelden"
					icon="i-lucide-log-in"
					block
					:loading="isCompleting"
					@click="onSignIn"
				/>
				<p class="text-xs text-muted">
					Schülerdaten bleiben weiterhin nur lokal in diesem Browser gespeichert.
				</p>
			</div>
		</UCard>
	</UContainer>
</template>
