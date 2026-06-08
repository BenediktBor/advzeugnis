<script setup lang="ts">
import { api } from '~/utils/convexApi'

definePageMeta({ layout: 'default' })

useAppSeo({
	title: 'Einladung',
	robots: APP_ROBOTS,
})

const route = useRoute()
const router = useRouter()
const client = useConvexClient()
const { isAuthenticated, isLoaded } = useCurrentUser()

const isAccepting = ref(false)
const error = ref('')

const token = computed(() => String(route.params.token || ''))
const isAuthReady = computed(() => isLoaded.value)

async function onAccept() {
	error.value = ''
	if (!isAuthReady.value) return
	if (!isAuthenticated.value) {
		await router.push({
			path: '/sign-in',
			query: { redirect: route.fullPath },
		})
		return
	}

	isAccepting.value = true
	try {
		await client.mutation(api.schools.acceptInvite, { token: token.value })
		await router.push('/app/school')
	} catch (err) {
		console.error('[school] invite acceptance failed:', err)
		error.value = String(err).includes('Invite email does not match')
			? 'Diese Einladung wurde fuer eine andere E-Mail-Adresse erstellt.'
			: String(err).includes('School subscription is not active')
				? 'Die Schul-Subscription ist noch nicht aktiv.'
				: String(err).includes('No seats available')
					? 'In dieser Schule sind keine freien Sitzplaetze verfuegbar.'
					: String(err).includes('Invite has expired')
						? 'Diese Einladung ist abgelaufen.'
						: 'Einladung konnte nicht angenommen werden.'
	} finally {
		isAccepting.value = false
	}
}
</script>

<template>
	<UContainer class="flex min-h-screen items-center justify-center py-12">
		<div class="flex w-full max-w-md flex-col gap-4">
			<UButton
				to="/"
				label="Zurück zur Startseite"
				variant="outline"
				color="neutral"
				icon="i-lucide-arrow-left"
				class="w-fit"
			/>

			<UCard class="w-full">
			<template #header>
				<div class="space-y-1">
					<h1 class="text-xl font-semibold text-highlighted">Schuleinladung</h1>
					<p class="text-sm text-muted">
						Melde dich an und tritt der Schule kostenlos über die Einladung bei.
					</p>
				</div>
			</template>

			<div class="flex flex-col gap-4">
				<UAlert v-if="error" color="error" variant="soft" :title="error" />
				<AppStateNotice
					v-if="!isAuthReady"
					title="Anmeldung wird geprüft"
					icon="i-lucide-loader-2"
					loading
				/>
				<template v-else>
					<p v-if="!isAuthenticated" class="text-sm text-muted">
						Du hast noch kein Konto? Auf der Anmeldeseite kannst du dich registrieren
						oder mit einem bestehenden Konto anmelden.
					</p>
					<UButton
						:label="isAuthenticated ? 'Einladung annehmen' : 'Anmelden und Einladung annehmen'"
						icon="i-lucide-mail-check"
						:loading="isAccepting"
						@click="onAccept"
					/>
				</template>
			</div>
			</UCard>
		</div>
	</UContainer>
</template>
