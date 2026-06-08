<script setup lang="ts">
import type { SchoolRole } from '~/types/user'

const { currentUser, canManageTeachers } = useCurrentUser()
const {
	school,
	members,
	invites,
	inviteMember,
	revokeInvite,
	removeMember,
	setRole,
	transferOwnership,
	deleteSchool,
} = useSchool()

// Temporary switch while Stripe billing is disabled for Convex deployment.
const BILLING_TEMPORARILY_DISABLED = true

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
const transferringOwnerId = ref<string | null>(null)
const removingMemberId = ref<string | null>(null)
const revokingInviteId = ref<string | null>(null)
const isDeletingSchool = ref(false)
const removeMemberDialog = useConfirmDialog()
const transferOwnershipDialog = useConfirmDialog()
const deleteSchoolDialog = useConfirmDialog()
const error = ref('')
const inviteNotice = ref<{
	type: 'success' | 'warning'
	title: string
	description?: string
	inviteUrl?: string
} | null>(null)

const inviteBaseUrl = computed(() =>
	(typeof window === 'undefined' ? '' : window.location.origin),
)

const hasActiveSubscription = computed(() =>
	BILLING_TEMPORARILY_DISABLED || school.value?.subscriptionStatus === 'active',
)
const billingStatusBadge = computed(() => {
	if (BILLING_TEMPORARILY_DISABLED) return { color: 'neutral' as const, label: 'Abrechnung pausiert' }
	return {
		color: hasActiveSubscription.value ? 'success' as const : 'warning' as const,
		label: hasActiveSubscription.value ? 'Abrechnung aktiv' : `Abrechnung ${school.value?.subscriptionStatus}`,
	}
})
const canInviteUsers = computed(() => canManageTeachers.value && hasActiveSubscription.value)
const isOwner = computed(() => school.value?.role === 'owner')

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
		error.value = 'Einladungen sind aktuell nicht möglich.'
		return
	}
	error.value = ''
	inviteNotice.value = null
	isInviting.value = true
	try {
		const invite = await inviteMember({
			email: newInvite.value.email.trim(),
			role: newInvite.value.role,
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

function openRemoveMemberDialog(member: { id: string, displayName: string, role: SchoolRole }) {
	if (!canManageTeachers.value || member.id === currentUser.value.id || member.role === 'owner') return
	removeMemberDialog.show({
		title: 'Nutzer entfernen',
		description: `${member.displayName} aus der Schule entfernen? Der Zugriff auf Schulvorlagen endet sofort.`,
		onConfirm: async () => {
			error.value = ''
			removingMemberId.value = member.id
			try {
				await removeMember(member.id)
			} catch (err) {
				console.error('[school] remove member failed:', err)
				error.value = 'Nutzer konnte nicht entfernt werden.'
			} finally {
				removingMemberId.value = null
			}
		},
	})
}

async function handleRevokeInvite(inviteId: string) {
	error.value = ''
	revokingInviteId.value = inviteId
	try {
		await revokeInvite(inviteId)
	} catch (err) {
		console.error('[school] revoke invite failed:', err)
		error.value = 'Einladung konnte nicht widerrufen werden.'
	} finally {
		revokingInviteId.value = null
	}
}

function canChangeRole(member: { id: string, role: SchoolRole }) {
	return canManageTeachers.value && member.id !== currentUser.value.id && member.role !== 'owner'
}

function canTransferOwnership(member: { id: string, role: SchoolRole }) {
	return isOwner.value && member.id !== currentUser.value.id && member.role !== 'owner'
}

function openTransferOwnershipDialog(member: { id: string, displayName: string, role: SchoolRole }) {
	if (!canTransferOwnership(member)) return
	transferOwnershipDialog.show({
		title: 'Schule übertragen',
		description: `${member.displayName} übernimmt die Schule. Du behältst danach Admin-Rechte.`,
		onConfirm: async () => {
			error.value = ''
			transferringOwnerId.value = member.id
			try {
				await transferOwnership(member.id)
			} catch (err) {
				console.error('[school] ownership transfer failed:', err)
				error.value = 'Schule konnte nicht übertragen werden.'
			} finally {
				transferringOwnerId.value = null
			}
		},
	})
}

function openDeleteSchoolDialog() {
	if (!isOwner.value || isDeletingSchool.value) return
	deleteSchoolDialog.show({
		title: 'Schule löschen',
		description: 'Alle Einladungen, Schulvorlagen und Mitgliedschaften werden entfernt. Diese Aktion kann nicht rückgängig gemacht werden.',
		onConfirm: async () => {
			error.value = ''
			isDeletingSchool.value = true
			try {
				await deleteSchool()
				await navigateTo('/app')
			} catch (err) {
				console.error('[school] delete failed:', err)
				error.value = 'Schule konnte nicht gelöscht werden.'
			} finally {
				isDeletingSchool.value = false
			}
		},
	})
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
					description="Lege eine Schule an, um Teammitglieder einzuladen und Vorlagen zu synchronisieren. Die Abrechnung ist vorübergehend deaktiviert."
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
										:color="billingStatusBadge.color"
										variant="soft"
										:label="billingStatusBadge.label"
									/>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
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
							description="Stripe Checkout ist aktuell pausiert, bis die Convex-Bereitstellung abgeschlossen ist."
						/>
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
									<UTooltip v-if="canTransferOwnership(member)" text="Schule übertragen">
										<UButton
											icon="i-lucide-crown"
											color="warning"
											variant="ghost"
											aria-label="Schule übertragen"
											:loading="transferringOwnerId === member.id"
											@click="openTransferOwnershipDialog(member)"
										/>
									</UTooltip>
									<UButton
										v-if="canManageTeachers && member.id !== currentUser.id && member.role !== 'owner'"
										icon="i-lucide-trash-2"
										color="error"
										variant="ghost"
										aria-label="Nutzer entfernen"
										:loading="removingMemberId === member.id"
										@click="openRemoveMemberDialog(member)"
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
							<UButton
								label="Widerrufen"
								color="error"
								variant="ghost"
								:loading="revokingInviteId === invite.id"
								@click="handleRevokeInvite(invite.id)"
							/>
						</div>
					</div>
					<p v-else class="text-sm text-muted">Keine offenen Einladungen.</p>
				</UCard>

				<UCard v-if="isOwner">
					<template #header>
						<h2 class="font-semibold text-error">Gefahrenbereich</h2>
					</template>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p class="font-medium text-highlighted">Schule löschen</p>
							<p class="text-sm text-muted">
								Entfernt die Schule, offene Einladungen, Schulvorlagen und alle Mitgliedschaften.
							</p>
						</div>
						<UButton
							label="Schule löschen"
							icon="i-lucide-trash-2"
							color="error"
							variant="soft"
							@click="openDeleteSchoolDialog"
						/>
					</div>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>

	<UModal
		v-model:open="removeMemberDialog.open.value"
		:title="removeMemberDialog.title.value"
		:description="removeMemberDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton
				label="Abbrechen"
				color="neutral"
				variant="outline"
				@click="removeMemberDialog.cancel()"
			/>
			<UButton
				label="Entfernen"
				icon="i-lucide-trash-2"
				color="error"
				:loading="Boolean(removingMemberId)"
				@click="removeMemberDialog.confirm()"
			/>
		</template>
	</UModal>

	<UModal
		v-model:open="transferOwnershipDialog.open.value"
		:title="transferOwnershipDialog.title.value"
		:description="transferOwnershipDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton
				label="Abbrechen"
				color="neutral"
				variant="outline"
				@click="transferOwnershipDialog.cancel()"
			/>
			<UButton
				label="Schule übertragen"
				icon="i-lucide-crown"
				color="warning"
				:loading="Boolean(transferringOwnerId)"
				@click="transferOwnershipDialog.confirm()"
			/>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteSchoolDialog.open.value"
		:title="deleteSchoolDialog.title.value"
		:description="deleteSchoolDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton
				label="Abbrechen"
				color="neutral"
				variant="outline"
				:disabled="isDeletingSchool"
				@click="deleteSchoolDialog.cancel()"
			/>
			<UButton
				label="Schule löschen"
				icon="i-lucide-trash-2"
				color="error"
				:loading="isDeletingSchool"
				@click="deleteSchoolDialog.confirm()"
			/>
		</template>
	</UModal>
</template>
