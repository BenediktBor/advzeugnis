<script setup lang="ts">
const { school, createSchool } = useSchool()

const schoolName = ref('')
const seatLimit = ref(5)
const isSubmitting = ref(false)
const error = ref('')
const createdSchoolId = ref<string | null>(null)
const isExistingSchool = computed(() => Boolean(school.value))

watchEffect(() => {
	if (!school.value) return
	schoolName.value = school.value.name
	seatLimit.value = school.value.seatLimit
})

async function onSubmit() {
	if (isSubmitting.value) return
	error.value = ''
	if (!isExistingSchool.value && !schoolName.value.trim()) return

	isSubmitting.value = true
	try {
		if (!school.value && !createdSchoolId.value) {
			createdSchoolId.value = await createSchool({
				name: schoolName.value.trim(),
				seatLimit: seatLimit.value,
			}) as string
		}
		await navigateTo('/app/school')
	} catch (err) {
		console.error('[school] setup failed:', err)
		error.value = school.value || createdSchoolId.value
			? 'Schule wurde angelegt, aber die Weiterleitung konnte nicht abgeschlossen werden.'
			: 'Schule konnte nicht angelegt werden. Bitte versuche es erneut.'
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
							{{ isExistingSchool ? 'Schule ist eingerichtet' : 'Neue Schule anlegen' }}
						</h1>
						<p class="text-sm text-muted">
							<span v-if="isExistingSchool">
								Deine Schule wurde bereits angelegt. Die Abrechnung ist vorübergehend deaktiviert.
							</span>
							<span v-else>
								Die Abrechnung ist vorübergehend deaktiviert. Du kannst die Schule anlegen und Teammitglieder direkt einladen.
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
						title="Abrechnung vorübergehend deaktiviert"
						description="Stripe Checkout ist pausiert, bis die Convex-Bereitstellung abgeschlossen ist."
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
						:label="isExistingSchool ? 'Zur Schule' : 'Schule anlegen'"
						icon="i-lucide-building-2"
						:loading="isSubmitting"
						class="w-fit"
					/>
				</form>
			</UCard>
		</template>
	</UDashboardPanel>
</template>
