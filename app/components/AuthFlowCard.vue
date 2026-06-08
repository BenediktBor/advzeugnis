<script setup lang="ts">
import { getStoredAuthToken } from '~/utils/convexAuthClient'

const props = withDefaults(defineProps<{
	initialMode?: 'signIn' | 'signUp' | 'magic' | 'reset'
}>(), {
	initialMode: 'signIn',
})

const route = useRoute()
const router = useRouter()
const {
	completeSignInFromUrl,
	requestMagicLink,
	requestPasswordReset,
	resetPassword,
	signInWithPassword,
	signUpWithPassword,
	verifyEmail,
} = useConvexAuthActions()
const isCompleting = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const message = ref('')
const mode = ref<'signIn' | 'signUp' | 'magic' | 'reset'>(props.initialMode)
const form = reactive({
	email: '',
	password: '',
	code: '',
	newPassword: '',
})
const pendingVerificationEmail = ref('')
const pendingResetEmail = ref('')
const privacyAccepted = ref(false)

const title = computed(() => {
	if (pendingVerificationEmail.value) return 'E-Mail bestaetigen'
	if (mode.value === 'signUp') return 'Konto erstellen'
	if (mode.value === 'reset') return 'Passwort zuruecksetzen'
	if (mode.value === 'magic') return 'Anmeldelink erhalten'
	return 'Anmelden'
})

const description = computed(() => {
	if (mode.value === 'signUp') return 'Erstelle dein Konto und richte danach deine Schule ein.'
	if (mode.value === 'reset') return 'Fordere einen Code an und vergib ein neues Passwort.'
	if (mode.value === 'magic') return 'Wir senden dir einen Link fuer die Anmeldung per E-Mail.'
	return 'Melde dich mit deiner E-Mail-Adresse an, um AdvancedZeugnis zu nutzen.'
})

const redirectQuery = computed(() => {
	const redirect = route.query.redirect
	return typeof redirect === 'string' ? { redirect } : undefined
})

function safeRedirectTarget(value: unknown) {
	const redirect = Array.isArray(value) ? value[0] : value
	if (typeof redirect !== 'string') return '/app'
	if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/app'
	return redirect
}

const redirectTo = computed(() => safeRedirectTarget(route.query.redirect))

const showSignUpPromo = computed(() => mode.value === 'signIn' && !pendingVerificationEmail.value)

const backLabel = computed(() => {
	if (pendingVerificationEmail.value) return 'Zurück zur Registrierung'
	if (mode.value === 'magic') return 'Zurück zur Anmeldung'
	return 'Zurück zur Startseite'
})

const backTo = computed(() => {
	if (pendingVerificationEmail.value || mode.value === 'magic') return undefined
	return '/'
})

function handleBack() {
	if (pendingVerificationEmail.value) {
		pendingVerificationEmail.value = ''
		form.code = ''
		resetStatus()
		return
	}
	if (mode.value === 'magic') {
		setMode('signIn')
	}
}

onMounted(async () => {
	const params = new URLSearchParams(window.location.search)
	if (!params.has('code') && !params.has('token')) {
		if (getStoredAuthToken()) await router.replace(redirectTo.value)
		return
	}
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

watch(
	() => props.initialMode,
	(nextMode) => {
		mode.value = nextMode
		resetStatus()
		pendingVerificationEmail.value = ''
		pendingResetEmail.value = ''
		privacyAccepted.value = false
		form.code = ''
		form.newPassword = ''
	}
)

function resetStatus() {
	error.value = ''
	message.value = ''
}

function setMode(nextMode: typeof mode.value) {
	mode.value = nextMode
	resetStatus()
	pendingVerificationEmail.value = ''
	pendingResetEmail.value = ''
	privacyAccepted.value = false
	form.code = ''
	form.newPassword = ''
}

async function submitPasswordAuth() {
	resetStatus()
	if (!form.email.trim() || !form.password) return
	if (mode.value === 'signUp' && !privacyAccepted.value) {
		error.value = 'Bitte bestätige die Datenschutzerklärung.'
		return
	}
	isSubmitting.value = true
	try {
		const result = mode.value === 'signUp'
			? await signUpWithPassword({
					email: form.email.trim(),
					password: form.password,
				})
			: await signInWithPassword({
					email: form.email.trim(),
					password: form.password,
				})
		if (result.isSignedIn) {
			await router.replace(redirectTo.value)
			return
		}
		pendingVerificationEmail.value = form.email.trim()
		message.value = 'Wir haben dir einen Bestaetigungscode per E-Mail geschickt.'
	} catch (err) {
		console.error('[auth] sign-in failed:', err)
		error.value = mode.value === 'signUp'
			? 'Konto konnte nicht erstellt werden.'
			: 'Anmeldung konnte nicht abgeschlossen werden.'
	} finally {
		isSubmitting.value = false
	}
}

async function submitEmailVerification() {
	resetStatus()
	if (!pendingVerificationEmail.value || !form.code.trim()) return
	isSubmitting.value = true
	try {
		const result = await verifyEmail(pendingVerificationEmail.value, form.code.trim())
		if (result.isSignedIn) await router.replace(redirectTo.value)
	} catch (err) {
		console.error('[auth] email verification failed:', err)
		error.value = 'Bestaetigungscode ist ungueltig oder abgelaufen.'
	} finally {
		isSubmitting.value = false
	}
}

async function submitMagicLink() {
	resetStatus()
	if (!form.email.trim()) return
	isSubmitting.value = true
	try {
		await requestMagicLink(form.email.trim(), redirectTo.value)
		message.value = 'Wir haben dir einen Anmeldelink per E-Mail geschickt.'
	} catch (err) {
		console.error('[auth] magic link failed:', err)
		error.value = 'Anmeldelink konnte nicht verschickt werden.'
	} finally {
		isSubmitting.value = false
	}
}

async function submitPasswordReset() {
	resetStatus()
	isSubmitting.value = true
	try {
		if (!pendingResetEmail.value) {
			if (!form.email.trim()) return
			await requestPasswordReset(form.email.trim())
			pendingResetEmail.value = form.email.trim()
			message.value = 'Wir haben dir einen Code zum Zuruecksetzen geschickt.'
			return
		}
		if (!form.code.trim() || !form.newPassword) return
		const result = await resetPassword(pendingResetEmail.value, form.code.trim(), form.newPassword)
		if (result.isSignedIn) {
			await router.replace(redirectTo.value)
			return
		}
		setMode('signIn')
		message.value = 'Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.'
	} catch (err) {
		console.error('[auth] password reset failed:', err)
		error.value = 'Passwort konnte nicht zurueckgesetzt werden.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<div class="flex w-full max-w-md flex-col gap-4">
		<UButton
			v-if="backTo"
			:to="backTo"
			:label="backLabel"
			variant="outline"
			color="neutral"
			icon="i-lucide-arrow-left"
			class="w-fit"
		/>
		<UButton
			v-else
			:label="backLabel"
			variant="outline"
			color="neutral"
			icon="i-lucide-arrow-left"
			class="w-fit"
			@click="handleBack"
		/>

		<UCard class="w-full">
		<template #header>
			<div class="space-y-1">
				<h1 class="text-xl font-semibold text-highlighted">{{ title }}</h1>
				<p class="text-sm text-muted">{{ description }}</p>
			</div>
		</template>

		<div class="flex flex-col gap-4">
			<UAlert
				v-if="error"
				color="error"
				variant="soft"
				:title="error"
			/>
			<UAlert
				v-if="message"
				color="success"
				variant="soft"
				:title="message"
			/>

			<form
				v-if="pendingVerificationEmail"
				class="flex w-full flex-col gap-3"
				@submit.prevent="submitEmailVerification"
			>
				<UFormField label="Bestaetigungscode" class="w-full">
					<UInput v-model="form.code" class="w-full" autocomplete="one-time-code" required />
				</UFormField>
				<UButton
					type="submit"
					label="E-Mail bestaetigen"
					icon="i-lucide-check"
					block
					:loading="isSubmitting || isCompleting"
				/>
			</form>

			<form
				v-else-if="mode === 'signIn' || mode === 'signUp'"
				class="flex w-full flex-col gap-3"
				@submit.prevent="submitPasswordAuth"
			>
				<UFormField label="E-Mail" class="w-full">
					<UInput v-model="form.email" class="w-full" type="email" autocomplete="email" required />
				</UFormField>
				<UFormField label="Passwort" class="w-full">
					<UInput
						v-model="form.password"
						class="w-full"
						type="password"
						:autocomplete="mode === 'signUp' ? 'new-password' : 'current-password'"
						required
						:minlength="8"
					/>
				</UFormField>
				<UFormField
					v-if="mode === 'signUp'"
					class="w-full"
				>
					<UCheckbox
						v-model="privacyAccepted"
						required
					>
						<template #label>
							<span class="text-sm text-muted">Ich habe die <ULink to="/datenschutz" target="_blank" class="text-primary hover:underline" @click.stop>Datenschutzerklärung</ULink> gelesen und akzeptiere sie.</span>
						</template>
					</UCheckbox>
				</UFormField>
				<UButton
					type="submit"
					:label="mode === 'signUp' ? 'Konto erstellen' : 'Anmelden'"
					icon="i-lucide-log-in"
					block
					:loading="isSubmitting || isCompleting"
					:disabled="mode === 'signUp' && !privacyAccepted"
				/>
			</form>

			<form
				v-else-if="mode === 'magic'"
				class="flex w-full flex-col gap-3"
				@submit.prevent="submitMagicLink"
			>
				<UFormField label="E-Mail" class="w-full">
					<UInput v-model="form.email" class="w-full" type="email" autocomplete="email" required />
				</UFormField>
				<UButton
					type="submit"
					label="Anmeldelink senden"
					icon="i-lucide-mail"
					block
					:loading="isSubmitting || isCompleting"
				/>
			</form>

			<form
				v-else
				class="flex w-full flex-col gap-3"
				@submit.prevent="submitPasswordReset"
			>
				<UFormField v-if="!pendingResetEmail" label="E-Mail" class="w-full">
					<UInput v-model="form.email" class="w-full" type="email" autocomplete="email" required />
				</UFormField>
				<template v-else>
					<UFormField label="Code" class="w-full">
						<UInput v-model="form.code" class="w-full" autocomplete="one-time-code" required />
					</UFormField>
					<UFormField label="Neues Passwort" class="w-full">
						<UInput
							v-model="form.newPassword"
							class="w-full"
							type="password"
							autocomplete="new-password"
							required
							:minlength="8"
						/>
					</UFormField>
				</template>
				<UButton
					type="submit"
					:label="pendingResetEmail ? 'Passwort speichern' : 'Code senden'"
					icon="i-lucide-key-round"
					block
					:loading="isSubmitting || isCompleting"
				/>
			</form>

			<div class="flex flex-wrap justify-center gap-2 text-sm">
				<NuxtLink v-if="mode !== 'signIn'" :to="{ path: '/sign-in', query: redirectQuery }">
					<UButton label="Anmelden" color="neutral" variant="link" />
				</NuxtLink>
				<NuxtLink v-if="mode !== 'signUp' && mode !== 'signIn'" :to="{ path: '/register', query: redirectQuery }">
					<UButton label="Konto erstellen" color="neutral" variant="link" />
				</NuxtLink>
				<UButton
					v-if="mode === 'signIn'"
					label="Anmeldelink per E-Mail"
					color="neutral"
					variant="link"
					@click="setMode('magic')"
				/>
				<NuxtLink v-if="mode !== 'reset'" :to="{ path: '/reset-password', query: redirectQuery }">
					<UButton label="Passwort vergessen?" color="neutral" variant="link" />
				</NuxtLink>
			</div>

			<p class="text-xs text-muted">
				Schülerdaten bleiben weiterhin nur lokal in diesem Browser gespeichert.
			</p>
		</div>
		</UCard>

		<UCard v-if="showSignUpPromo" variant="soft" class="w-full">
			<div class="flex flex-col gap-3">
				<p class="text-sm font-medium text-highlighted">Neu hier?</p>
				<p class="text-sm text-muted">
					Erstelle dein Konto bei AdvancedZeugnis und richte danach deine Schule ein.
				</p>
				<NuxtLink :to="{ path: '/register', query: redirectQuery }">
					<UButton
						label="Konto erstellen"
						icon="i-lucide-user-plus"
						block
					/>
				</NuxtLink>
			</div>
		</UCard>
	</div>
</template>
