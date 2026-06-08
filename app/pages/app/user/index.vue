<script setup lang="ts">
import { api } from '~/utils/convexApi'
import { clearAuthTokens } from '~/utils/convexAuthClient'

const { currentUser } = useCurrentUser()
const { signOut } = useConvexAuthActions()
const client = useConvexClient()

const deleteModalOpen = ref(false)
const deleteConfirmation = ref('')
const isDeleting = ref(false)
const deleteError = ref('')

const canConfirmDelete = computed(() => deleteConfirmation.value === 'LOESCHEN')

async function deleteAccount() {
	if (!canConfirmDelete.value) return
	deleteError.value = ''
	isDeleting.value = true
	try {
		await client.action(api.users.deleteCurrentAccount, {})
		clearAuthTokens()
		await navigateTo('/', { replace: true })
	} catch (err) {
		console.error('[user] account deletion failed:', err)
		deleteError.value = 'Konto konnte nicht gelöscht werden. Falls du Schul-Admin bist, entferne oder übertrage zuerst andere Mitglieder.'
	} finally {
		isDeleting.value = false
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Benutzer">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex max-w-xl flex-col gap-4">
				<UCard>
					<template #header>
						<h1 class="font-semibold text-highlighted">Benutzerkonto</h1>
					</template>
					<dl class="flex flex-col gap-3 text-sm">
						<div>
							<dt class="font-medium text-highlighted">Name</dt>
							<dd class="text-muted">{{ currentUser.displayName }}</dd>
						</div>
						<div v-if="currentUser.email">
							<dt class="font-medium text-highlighted">E-Mail</dt>
							<dd class="text-muted">{{ currentUser.email }}</dd>
						</div>
						<div>
							<dt class="font-medium text-highlighted">Schule</dt>
							<dd class="text-muted">
								{{ currentUser.schoolName ?? 'Keine Schule eingerichtet' }}
							</dd>
						</div>
						<div v-if="currentUser.role">
							<dt class="font-medium text-highlighted">Rolle</dt>
							<dd class="text-muted">{{ currentUser.role }}</dd>
						</div>
					</dl>
				</UCard>
				<div class="flex flex-wrap gap-2">
					<UButton
						v-if="currentUser.type === 'solo'"
						label="Schule einrichten"
						to="/app/setup-school"
						icon="i-lucide-building-2"
					/>
					<UButton
						label="Abmelden"
						icon="i-lucide-log-out"
						color="neutral"
						variant="outline"
						@click="signOut"
					/>
				</div>
				<UCard>
					<template #header>
						<div class="space-y-1">
							<h2 class="font-semibold text-error">Konto löschen</h2>
							<p class="text-sm text-muted">
								Löscht dein Benutzerkonto und beendet deine Sitzungen.
							</p>
						</div>
					</template>
					<div class="flex flex-col gap-3">
						<UAlert
							color="warning"
							variant="soft"
							title="Diese Aktion kann nicht rückgängig gemacht werden."
							description="Wenn du Schul-Admin bist, musst du zuerst andere aktive Mitglieder entfernen oder die Schule darf keine weiteren aktiven Mitglieder haben."
						/>
						<UButton
							label="Konto löschen"
							icon="i-lucide-trash-2"
							color="error"
							variant="soft"
							class="w-fit"
							@click="deleteModalOpen = true"
						/>
					</div>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>

	<UModal v-model:open="deleteModalOpen">
		<template #content>
			<div class="flex flex-col gap-4 p-4">
				<div class="space-y-1">
					<h3 class="font-semibold text-error">Konto wirklich löschen?</h3>
					<p class="text-sm text-muted">
						Gib <strong>LOESCHEN</strong> ein, um dein Konto dauerhaft zu löschen.
					</p>
				</div>
				<UAlert v-if="deleteError" color="error" variant="soft" :title="deleteError" />
				<UFormField label="Bestätigung">
					<UInput v-model="deleteConfirmation" autocomplete="off" />
				</UFormField>
				<div class="flex justify-end gap-2">
					<UButton
						label="Abbrechen"
						color="neutral"
						variant="ghost"
						:disabled="isDeleting"
						@click="deleteModalOpen = false"
					/>
					<UButton
						label="Konto löschen"
						icon="i-lucide-trash-2"
						color="error"
						:disabled="!canConfirmDelete"
						:loading="isDeleting"
						@click="deleteAccount"
					/>
				</div>
			</div>
		</template>
	</UModal>
</template>
