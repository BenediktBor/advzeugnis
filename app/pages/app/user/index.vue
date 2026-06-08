<script setup lang="ts">
useAppSeo({
	title: 'Benutzer',
	robots: APP_ROBOTS,
})

const { currentUser } = useCurrentUser()
const { signOut } = useConvexAuthActions()

const deleteModalOpen = ref(false)
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Benutzer">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>

				<template #right>
					<UButton
						label="Abmelden"
						icon="i-lucide-log-out"
						color="neutral"
						variant="outline"
						@click="signOut"
					/>
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

				<div v-if="currentUser.type === 'solo'" class="flex flex-wrap gap-2">
					<UButton
						
						label="Schule einrichten"
						to="/app/setup-school"
						icon="i-lucide-building-2"
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

	<DeleteAccountModal v-model:open="deleteModalOpen" />
</template>
