<script setup lang="ts">
import { api } from '~/utils/convexApi'

const config = useRuntimeConfig()
const client = useConvexClient()
const { school, createSchool } = useSchool()

const schoolName = ref('')
const seatLimit = ref(5)
const isSubmitting = ref(false)
const error = ref('')

const siteUrl = computed(() =>
	config.public.siteUrl ||
	(typeof window === 'undefined' ? '' : window.location.origin),
)

async function onSubmit() {
	error.value = ''
	if (!schoolName.value.trim()) return
	if (!config.public.stripePriceId) {
		error.value = 'Stripe Preis-ID fehlt in NUXT_PUBLIC_STRIPE_PRICE_ID.'
		return
	}

	isSubmitting.value = true
	try {
		if (!school.value) {
			await createSchool({
				name: schoolName.value.trim(),
				seatLimit: seatLimit.value,
			})
		}
		const checkout = await client.action(api.billing.createSchoolCheckout, {
			priceId: config.public.stripePriceId,
			seatLimit: seatLimit.value,
			successUrl: `${siteUrl.value}/app/school?billing=success`,
			cancelUrl: `${siteUrl.value}/app/setup-school?billing=cancelled`,
		}) as { url: string | null }
		if (checkout.url) window.location.href = checkout.url
	} catch (err) {
		console.error('[billing] checkout failed:', err)
		error.value = 'Schule oder Checkout konnte nicht erstellt werden.'
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
						<h1 class="text-lg font-semibold text-highlighted">Neue Schule anlegen</h1>
						<p class="text-sm text-muted">
							Die Schule wird über Stripe abgerechnet. Eingeladene Nutzer verwenden AdvancedZeugnis kostenlos über diese Schulmitgliedschaft.
						</p>
					</div>
				</template>

				<form class="flex flex-col gap-4" @submit.prevent="onSubmit">
					<UAlert v-if="error" color="error" variant="soft" :title="error" />
					<UFormField label="Schulname">
						<UInput v-model="schoolName" required placeholder="Mustergrundschule" />
					</UFormField>
					<UFormField label="Sitzplätze">
						<UInput v-model.number="seatLimit" type="number" min="1" required />
					</UFormField>
					<UButton
						type="submit"
						label="Weiter zu Stripe"
						icon="i-lucide-credit-card"
						:loading="isSubmitting"
						class="w-fit"
					/>
				</form>
			</UCard>
		</template>
	</UDashboardPanel>
</template>
