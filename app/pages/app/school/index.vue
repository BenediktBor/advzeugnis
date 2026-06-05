<script setup lang="ts">
import type { SchoolRole } from '~/types/user'
import { api } from '~/utils/convexApi'

const { currentUser, canManageTeachers } = useCurrentUser()
const { school, members, invites, inviteMember, revokeInvite, removeMember, setRole } = useSchool()
const client = useConvexClient()
const config = useRuntimeConfig()
const route = useRoute()

const roleLabels: Record<SchoolRole, string> = {
	admin: 'Admin',
	templateManager: 'Template Manager',
	teacher: 'Lehrer',
}

const ROLE_OPTIONS = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Template Manager', value: 'templateManager' },
	{ label: 'Lehrer', value: 'teacher' },
]

const newInvite = ref({ email: '', role: 'teacher' as SchoolRole })
const showAddForm = ref(false)
const isInviting = ref(false)
const isOpeningPortal = ref(false)
const error = ref('')

const inviteBaseUrl = computed(() =>
	config.public.siteUrl ||
	(typeof window === 'undefined' ? '' : window.location.origin),
)

const billingSuccess = computed(() => route.query.billing === 'success')

function inviteUrl(token: string) {
	return `${inviteBaseUrl.value}/invite/${token}`
}

async function handleInviteMember() {
	if (!newInvite.value.email.trim()) return
	error.value = ''
	isInviting.value = true
	try {
		await inviteMember({
			email: newInvite.value.email.trim(),
			role: newInvite.value.role,
		})
		newInvite.value = { email: '', role: 'teacher' }
		showAddForm.value = false
	} catch (err) {
		console.error('[school] invite failed:', err)
		error.value = 'Einladung konnte nicht erstellt werden.'
	} finally {
		isInviting.value = false
	}
}

async function openBillingPortal() {
	error.value = ''
	isOpeningPortal.value = true
	try {
		const result = await client.action(api.billing.createCustomerPortal, {
			returnUrl: `${inviteBaseUrl.value}/app/school`,
		}) as { url: string }
		window.location.href = result.url
	} catch (err) {
		console.error('[billing] portal failed:', err)
		error.value = 'Stripe Kundenportal konnte nicht geöffnet werden.'
	} finally {
		isOpeningPortal.value = false
	}
}

async function copyInviteUrl(token: string) {
	await navigator.clipboard.writeText(inviteUrl(token))
}

async function updateRole(userId: string, value: unknown) {
	const role = typeof value === 'object' && value !== null && 'value' in value
		? (value as { value: SchoolRole }).value
		: value as SchoolRole
	await setRole(userId, role)
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Schule">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div v-if="!school" class="max-w-xl">
				<AppStateNotice
					title="Noch keine Schule eingerichtet"
					description="Lege eine Schule an und aktiviere die Stripe-Abrechnung, um Teammitglieder einzuladen und Vorlagen zu synchronisieren."
					icon="i-lucide-building-2"
					tone="primary"
				>
					<UButton
						label="Schule einrichten"
						to="/app/setup-school"
						icon="i-lucide-credit-card"
					/>
				</AppStateNotice>
			</div>
			<div v-else class="flex max-w-5xl flex-col gap-6">
				<UAlert
					v-if="billingSuccess"
					color="success"
					variant="soft"
					title="Stripe Checkout abgeschlossen"
					description="Sobald der Stripe Webhook verarbeitet wurde, wird die Schulmitgliedschaft als aktiv markiert."
				/>
				<UAlert v-if="error" color="error" variant="soft" :title="error" />

				<UCard>
					<template #header>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-lg font-semibold text-highlighted">{{ school.name }}</h1>
								<p class="text-sm text-muted">
									{{ members.length }} von {{ school.seatLimit }} Sitzplätzen belegt · Status: {{ school.subscriptionStatus }}
								</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<UButton
									v-if="canManageTeachers && school.stripeCustomerId"
									label="Abrechnung verwalten"
									icon="i-lucide-credit-card"
									color="neutral"
									variant="outline"
									:loading="isOpeningPortal"
									@click="openBillingPortal"
								/>
								<UButton
									v-if="canManageTeachers"
									label="Nutzer einladen"
									icon="i-lucide-user-plus"
									@click="showAddForm = true"
								/>
							</div>
						</div>
					</template>

					<div class="flex flex-col gap-4">
						<UAlert
							v-if="!canManageTeachers"
							color="neutral"
							variant="soft"
							title="Nur Schul-Admins können Nutzer einladen, entfernen und Rollen ändern."
						/>

						<form
							v-if="showAddForm && canManageTeachers"
							class="grid gap-3 rounded-lg border border-default bg-muted/30 p-3 sm:grid-cols-[1fr_14rem_auto]"
							@submit.prevent="handleInviteMember"
						>
							<UFormField label="E-Mail">
								<UInput v-model="newInvite.email" type="email" required placeholder="name@schule.example" />
							</UFormField>
							<UFormField label="Rolle">
								<USelectMenu
									v-model="newInvite.role"
									:items="ROLE_OPTIONS"
									value-key="value"
									label-key="label"
								/>
							</UFormField>
							<div class="flex items-end gap-2">
								<UButton type="submit" label="Einladen" :loading="isInviting" />
								<UButton label="Abbrechen" color="neutral" variant="ghost" @click="showAddForm = false" />
							</div>
						</form>

						<div class="overflow-hidden rounded-lg border border-default">
							<div
								v-for="member in members"
								:key="member.id"
								class="grid gap-3 border-b border-default p-3 last:border-b-0 md:grid-cols-[1fr_14rem_auto]"
							>
								<div class="min-w-0">
									<div class="truncate font-medium text-highlighted">{{ member.displayName }}</div>
									<div class="truncate text-sm text-muted">{{ member.email ?? 'Keine E-Mail' }}</div>
								</div>
								<USelectMenu
									v-if="canManageTeachers"
									:items="ROLE_OPTIONS"
									:model-value="member.role"
									value-key="value"
									label-key="label"
									@update:model-value="(value: unknown) => updateRole(member.id, value)"
								/>
								<div v-else class="text-sm text-muted">{{ roleLabels[member.role] }}</div>
								<UButton
									v-if="canManageTeachers && member.id !== currentUser.id"
									icon="i-lucide-trash-2"
									color="error"
									variant="ghost"
									aria-label="Nutzer entfernen"
									@click="removeMember(member.id)"
								/>
							</div>
						</div>
					</div>
				</UCard>

				<UCard v-if="canManageTeachers">
					<template #header>
						<h2 class="font-semibold text-highlighted">Offene Einladungen</h2>
					</template>
					<div v-if="invites.length" class="flex flex-col gap-3">
						<div
							v-for="invite in invites"
							:key="invite.id"
							class="grid gap-3 rounded-lg border border-default p-3 md:grid-cols-[1fr_auto_auto]"
						>
							<div class="min-w-0">
								<div class="truncate font-medium text-highlighted">{{ invite.email }}</div>
								<div class="truncate text-sm text-muted">
									{{ roleLabels[invite.role] }} · gültig bis {{ new Date(invite.expiresAt).toLocaleDateString('de-DE') }}
								</div>
							</div>
							<UButton label="Link kopieren" color="neutral" variant="outline" @click="copyInviteUrl(invite.token)" />
							<UButton label="Widerrufen" color="error" variant="ghost" @click="revokeInvite(invite.id)" />
						</div>
					</div>
					<p v-else class="text-sm text-muted">Keine offenen Einladungen.</p>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
