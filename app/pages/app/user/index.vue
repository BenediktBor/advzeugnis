<script setup lang="ts">
const { currentUser } = useCurrentUser()
const { signOut } = useConvexAuthActions()
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
			</div>
		</template>
	</UDashboardPanel>
</template>
