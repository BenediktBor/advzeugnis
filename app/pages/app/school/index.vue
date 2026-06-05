<script setup lang="ts">
import type { SchoolRole } from '~/types/user'
import { api } from '~/utils/convexApi'

const { currentUser, canManageTeachers } = useCurrentUser()
const { school, members, invites, inviteMember, revokeInvite, removeMember, setRole, transferOwnership } = useSchool()
const client = useConvexClient()
const config = useRuntimeConfig()
const route = useRoute()

const roleLabels: Record<SchoolRole, string> = {
	owner: 'Owner',
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
const isOpeningCheckout = ref(false)
const transferringOwnerId = ref<string | null>(null)
const error = ref('')
const inviteNotice = ref<{
	type: 'success' | 'warning'
	title: string
	description?: string
	inviteUrl?: string
} | null>(null)

const inviteBaseUrl = computed(() =>
	config.public.siteUrl ||
	(typeof window === 'undefined' ? '' : window.location.origin),
)

const billingSuccess = computed(() => route.query.billing === 'success')
const hasActiveSubscription = computed(() => school.value?.subscriptionStatus === 'active')
const canInviteUsers = computed(() => canManageTeachers.value && hasActiveSubscription.value)
const canRestartCheckout = computed(() => canManageTeachers.value && !hasActiveSubscription.value)
const isOwner = computed(() => currentUser.value.role === 'owner')

function inviteUrl(token: string) {
	return `${inviteBaseUrl.value}/invite/${token}`
}

function openInviteForm() {
	if (!canInviteUsers.value) return
	showAddForm.value = true
}

async function handleInviteMember() {
	if (!newInvite.value.email.trim()) return
	if (!canInviteUsers.value) {
		error.value = 'Einladungen sind erst mit aktiver Schul-Abrechnung möglich.'
		return
	}
	error.value = ''
	inviteNotice.value = null
	isInviting.value = true
	try {
		const invite = await inviteMember({
			email: newInvite.value.email.trim(),
			role: newInvite.value.role,
			siteUrl: inviteBaseUrl.value,
		})
		inviteNotice.value = invite.emailSent
			? {
					type: 'success',
					title: 'Einladung wurde per E-Mail verschickt.',
					description: invite.emailId ? `Resend-ID: ${invite.emailId}` : undefined,
				}
			: {
					type: 'warning',
					title: 'Einladung wurde erstellt, aber die E-Mail konnte nicht versendet werden.',
					description: invite.emailError,
					inviteUrl: invite.inviteUrl,
				}
		newInvite.value = { email: '', role: 'teacher' }
		showAddForm.value = false
	} catch (err) {
		console.error('[school] invite failed:', err)
		error.value = 'Einladung konnte nicht erstellt oder per E-Mail verschickt werden.'
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

async function restartCheckout() {
	error.value = ''
	if (!school.value) return
	if (!config.public.stripePriceId) {
		error.value = 'Stripe Preis-ID fehlt in NUXT_PUBLIC_STRIPE_PRICE_ID. Trage die Test-Preis-ID ein und starte Nuxt neu.'
		return
	}

	isOpeningCheckout.value = true
	try {
		const result = await client.action(api.billing.createSchoolCheckout, {
			priceId: config.public.stripePriceId,
			seatLimit: school.value.seatLimit,
			successUrl: `${inviteBaseUrl.value}/app/school?billing=success`,
			cancelUrl: `${inviteBaseUrl.value}/app/school?billing=cancelled`,
		}) as { url: string | null }
		if (result.url) window.location.href = result.url
		else error.value = 'Stripe Checkout konnte nicht gestartet werden.'
	} catch (err) {
		console.error('[billing] checkout restart failed:', err)
		error.value = 'Stripe Checkout konnte nicht gestartet werden. Bitte pruefe Stripe-Konfiguration und versuche es erneut.'
	} finally {
		isOpeningCheckout.value = false
	}
}

async function copyInviteUrl(token: string) {
	await navigator.clipboard.writeText(inviteUrl(token))
}

async function copyRawInviteUrl(url: string) {
	await navigator.clipboard.writeText(url)
}

async function updateRole(userId: string, value: unknown) {
	const role = typeof value === 'object' && value !== null && 'value' in value
		? (value as { value: SchoolRole }).value
		: value as SchoolRole
	if (role === 'owner') return
	await setRole(userId, role)
}

function canChangeRole(member: { id: string, role: SchoolRole }) {
	return canManageTeachers.value && member.id !== currentUser.value.id && member.role !== 'owner'
}

async function transferOwner(member: { id: string, displayName: string }) {
	if (!isOwner.value || member.id === currentUser.value.id) return
	const confirmed = window.confirm(`Eigentum an ${member.displayName} übertragen? Du bleibst danach Admin.`)
	if (!confirmed) return

	error.value = ''
	transferringOwnerId.value = member.id
	try {
		await transferOwnership(member.id)
	} catch (err) {
		console.error('[school] ownership transfer failed:', err)
		error.value = 'Eigentum konnte nicht übertragen werden.'
	} finally {
		transferringOwnerId.value = null
	}
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
				<UAlert
					v-if="inviteNotice"
					:color="inviteNotice.type"
					variant="soft"
					:title="inviteNotice.title"
					:description="inviteNotice.description"
				>
					<template v-if="inviteNotice.inviteUrl" #actions>
						<UButton
							label="Einladungslink kopieren"
							color="warning"
							variant="solid"
							@click="copyRawInviteUrl(inviteNotice.inviteUrl)"
						/>
					</template>
				</UAlert>

				<UCard>
					<template #header>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-lg font-semibold text-highlighted">{{ school.name }}</h1>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
									<span>{{ members.length }} von {{ school.seatLimit }} Sitzplätzen belegt</span>
									<UBadge
										:color="hasActiveSubscription ? 'success' : 'warning'"
										variant="soft"
										:label="hasActiveSubscription ? 'Abrechnung aktiv' : `Abrechnung ${school.subscriptionStatus}`"
									/>
								</div>
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
									v-if="canRestartCheckout"
									label="Checkout fortsetzen"
									icon="i-lucide-credit-card"
									color="warning"
									variant="soft"
									:loading="isOpeningCheckout"
									@click="restartCheckout"
								/>
								<UButton
									v-if="canManageTeachers"
									label="Nutzer einladen"
									icon="i-lucide-user-plus"
									:disabled="!hasActiveSubscription"
									@click="openInviteForm"
								/>
							</div>
						</div>
					</template>

					<div class="flex flex-col gap-4">
						<UAlert
							v-if="canManageTeachers && !hasActiveSubscription"
							color="warning"
							variant="soft"
							title="Schul-Abrechnung noch nicht aktiv"
							description="Du kannst Nutzer erst einladen, wenn die Stripe-Subscription aktiv ist. Falls du gerade den Checkout abgeschlossen hast, warte kurz auf den Stripe-Webhook oder prüfe die Webhook-Konfiguration."
						>
							<template #actions>
								<UButton
									label="Checkout fortsetzen"
									icon="i-lucide-credit-card"
									color="warning"
									variant="solid"
									:loading="isOpeningCheckout"
									@click="restartCheckout"
								/>
							</template>
						</UAlert>
						<UAlert
							v-if="!canManageTeachers"
							color="neutral"
							variant="soft"
							title="Nur Schul-Admins können Nutzer einladen, entfernen und Rollen ändern."
						/>

						<form
							v-if="showAddForm && canInviteUsers"
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
									v-if="canChangeRole(member)"
									:items="ROLE_OPTIONS"
									:model-value="member.role"
									value-key="value"
									label-key="label"
									@update:model-value="(value: unknown) => updateRole(member.id, value)"
								/>
								<div v-else class="text-sm text-muted">{{ roleLabels[member.role] }}</div>
								<div class="flex justify-end gap-2">
									<UButton
										v-if="isOwner && member.id !== currentUser.id"
										label="Eigentum übertragen"
										icon="i-lucide-crown"
										color="warning"
										variant="soft"
										:loading="transferringOwnerId === member.id"
										@click="transferOwner(member)"
									/>
									<UButton
										v-if="canManageTeachers && member.id !== currentUser.id && member.role !== 'owner'"
										icon="i-lucide-trash-2"
										color="error"
										variant="ghost"
										aria-label="Nutzer entfernen"
										@click="removeMember(member.id)"
									/>
								</div>
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
