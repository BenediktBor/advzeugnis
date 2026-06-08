<script setup lang="ts">
import { getStoredAuthToken } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'default' })

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
const mode = ref<'signIn' | 'signUp' | 'magic' | 'reset'>('signIn')
const form = reactive({
	email: '',
	password: '',
	code: '',
	newPassword: '',
})
const pendingVerificationEmail = ref('')
const pendingResetEmail = ref('')

function safeRedirectTarget(value: unknown) {
	const redirect = Array.isArray(value) ? value[0] : value
	if (typeof redirect !== 'string') return '/app'
	if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/app'
	return redirect
}

const redirectTo = computed(() => {
	return safeRedirectTarget(route.query.redirect)
})

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

function resetStatus() {
	error.value = ''
	message.value = ''
}

function setMode(nextMode: typeof mode.value) {
	mode.value = nextMode
	resetStatus()
	pendingVerificationEmail.value = ''
	pendingResetEmail.value = ''
	form.code = ''
	form.newPassword = ''
}

async function submitPasswordAuth() {
	resetStatus()
	if (!form.email.trim() || !form.password) return
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
	<UContainer class="flex min-h-screen items-center justify-center py-12">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="space-y-1">
					<h1 class="text-xl font-semibold text-highlighted">Anmelden</h1>
					<p class="text-sm text-muted">
						Melde dich mit deiner E-Mail-Adresse an, um Schulvorlagen und Teamfunktionen zu nutzen.
					</p>
				</div>
			</template>

			<div class="flex flex-col gap-4">
				<div class="grid grid-cols-2 gap-2">
					<UButton
						label="Anmelden"
						:variant="mode === 'signIn' ? 'solid' : 'outline'"
						color="neutral"
						@click="setMode('signIn')"
					/>
					<UButton
						label="Konto erstellen"
						:variant="mode === 'signUp' ? 'solid' : 'outline'"
						color="neutral"
						@click="setMode('signUp')"
					/>
				</div>

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
					class="flex flex-col gap-3"
					@submit.prevent="submitEmailVerification"
				>
					<UFormField label="Bestaetigungscode">
						<UInput v-model="form.code" autocomplete="one-time-code" required />
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
					class="flex flex-col gap-3"
					@submit.prevent="submitPasswordAuth"
				>
					<UFormField label="E-Mail">
						<UInput v-model="form.email" type="email" autocomplete="email" required />
					</UFormField>
					<UFormField label="Passwort">
						<UInput
							v-model="form.password"
							type="password"
							autocomplete="current-password"
							required
							:minlength="8"
						/>
					</UFormField>
					<UButton
						type="submit"
						:label="mode === 'signUp' ? 'Konto erstellen' : 'Anmelden'"
						icon="i-lucide-log-in"
						block
						:loading="isSubmitting || isCompleting"
					/>
				</form>

				<form
					v-else-if="mode === 'magic'"
					class="flex flex-col gap-3"
					@submit.prevent="submitMagicLink"
				>
					<UFormField label="E-Mail">
						<UInput v-model="form.email" type="email" autocomplete="email" required />
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
					class="flex flex-col gap-3"
					@submit.prevent="submitPasswordReset"
				>
					<UFormField v-if="!pendingResetEmail" label="E-Mail">
						<UInput v-model="form.email" type="email" autocomplete="email" required />
					</UFormField>
					<template v-else>
						<UFormField label="Code">
							<UInput v-model="form.code" autocomplete="one-time-code" required />
						</UFormField>
						<UFormField label="Neues Passwort">
							<UInput
								v-model="form.newPassword"
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
					<UButton
						label="Anmeldelink per E-Mail"
						color="neutral"
						variant="link"
						@click="setMode('magic')"
					/>
					<UButton
						label="Passwort vergessen?"
						color="neutral"
						variant="link"
						@click="setMode('reset')"
					/>
				</div>

				<p class="text-xs text-muted">
					Schülerdaten bleiben weiterhin nur lokal in diesem Browser gespeichert.
				</p>
			</div>
		</UCard>
	</UContainer>
</template>
