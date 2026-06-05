<script setup lang="ts">
import { api } from '~/utils/convexApi'

const client = useConvexClient()
const { school, createSchool } = useSchool()

const schoolName = ref('')
const seatLimit = ref(5)
const isSubmitting = ref(false)
const error = ref('')
const isExistingSchool = computed(() => Boolean(school.value))

watchEffect(() => {
	if (!school.value) return
	schoolName.value = school.value.name
	seatLimit.value = school.value.seatLimit
})

async function onSubmit() {
	error.value = ''
	if (!isExistingSchool.value && !schoolName.value.trim()) return

	isSubmitting.value = true
	try {
		if (!school.value) {
			await createSchool({
				name: schoolName.value.trim(),
				seatLimit: seatLimit.value,
			})
		}
		const checkout = await client.action(api.billing.createSchoolCheckout, {
			seatLimit: seatLimit.value,
		}) as { url: string | null }
		if (checkout.url) window.location.href = checkout.url
		else error.value = 'Stripe Checkout konnte nicht gestartet werden.'
	} catch (err) {
		console.error('[billing] checkout failed:', err)
		error.value = school.value
			? 'Stripe Checkout konnte nicht gestartet werden. Bitte pruefe Stripe-Konfiguration und versuche es erneut.'
			: 'Schule wurde angelegt, aber Stripe Checkout konnte nicht gestartet werden. Du kannst den Checkout nach der Stripe-Konfiguration erneut starten.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Schule einrichten">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<UCard class="max-w-xl">
				<template #header>
					<div class="space-y-1">
						<h1 class="text-lg font-semibold text-highlighted">
							{{ isExistingSchool ? 'Stripe Checkout fortsetzen' : 'Neue Schule anlegen' }}
						</h1>
						<p class="text-sm text-muted">
							<span v-if="isExistingSchool">
								Deine Schule wurde bereits angelegt. Starte den Stripe Checkout erneut, um die Abrechnung zu aktivieren.
							</span>
							<span v-else>
								Die Schule wird über Stripe abgerechnet. Eingeladene Nutzer verwenden AdvancedZeugnis kostenlos über diese Schulmitgliedschaft.
							</span>
						</p>
					</div>
				</template>

				<form class="flex flex-col gap-4" @submit.prevent="onSubmit">
					<UAlert v-if="error" color="error" variant="soft" :title="error" />
					<UAlert
						v-if="isExistingSchool && school?.subscriptionStatus !== 'active'"
						color="warning"
						variant="soft"
						title="Abrechnung noch nicht aktiv"
						description="Du kannst den Checkout hier erneut starten. Erst nach erfolgreichem Stripe Webhook werden Einladungen freigeschaltet."
					/>
					<UFormField label="Schulname">
						<UInput
							v-model="schoolName"
							:disabled="isExistingSchool"
							:required="!isExistingSchool"
							placeholder="Mustergrundschule"
						/>
					</UFormField>
					<UFormField label="Sitzplätze">
						<UInput v-model.number="seatLimit" type="number" min="1" required />
					</UFormField>
					<UButton
						type="submit"
						:label="isExistingSchool ? 'Checkout erneut starten' : 'Weiter zu Stripe'"
						icon="i-lucide-credit-card"
						:loading="isSubmitting"
						class="w-fit"
					/>
				</form>
			</UCard>
		</template>
	</UDashboardPanel>
</template>
