<script setup lang="ts">
await navigateTo('/app', { replace: true })

/*
const { currentUser, setUserType, setUserRole } = useCurrentUser()
const router = useRouter()
const showPrototypeTools = import.meta.dev

onMounted(() => {
	if (currentUser.value.type === 'school') {
		router.replace('/app/school')
	}
})

function switchToSchool() {
	setUserType('school')
	router.push('/app/school')
}

function switchToSolo() {
	setUserType('solo')
}
*/
</script>

<template>
	<div />
	<!--
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Benutzer">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<div class="rounded-md border border-default bg-default p-4">
					<dl class="flex flex-col gap-2 text-sm">
						<div>
							<dt class="font-medium text-highlighted">Name</dt>
							<dd class="text-muted">
								{{ currentUser.displayName }}
							</dd>
						</div>
						<div v-if="currentUser.email">
							<dt class="font-medium text-highlighted">E-Mail</dt>
							<dd class="text-muted">{{ currentUser.email }}</dd>
						</div>
						<div>
							<dt class="font-medium text-highlighted">
								Kontotyp
							</dt>
							<dd class="text-muted">
								{{
									currentUser.type === 'solo'
										? 'Solo'
										: 'Schule'
								}}
								<span
									v-if="currentUser.role"
									class="text-muted"
								>
									(Rolle: {{ currentUser.role }})
								</span>
							</dd>
						</div>
					</dl>
				</div>

				<div
					v-if="showPrototypeTools"
					class="rounded-md border border-default bg-default p-3 text-sm text-muted"
				>
					<p class="font-medium text-highlighted">
						Prototyp-Umschalter
					</p>
					<p class="mt-1">
						Zum Testen der UI zwischen Solo- und Schul-Ansicht
						wechseln.
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<UButton
							v-if="currentUser.type === 'solo'"
							label="Als Schule anzeigen"
							icon="i-lucide-building-2"
							color="neutral"
							variant="outline"
							size="sm"
							@click="switchToSchool"
						/>
						<template v-else>
							<UButton
								label="Als Solo anzeigen"
								icon="i-lucide-user"
								color="neutral"
								variant="outline"
								size="sm"
								@click="switchToSolo"
							/>
							<UButton
								v-if="currentUser.role !== 'admin'"
								label="Als Admin"
								color="neutral"
								variant="outline"
								size="sm"
								@click="() => setUserRole('admin')"
							/>
							<UButton
								v-if="currentUser.role !== 'editor'"
								label="Als Editor"
								color="neutral"
								variant="outline"
								size="sm"
								@click="() => setUserRole('editor')"
							/>
							<UButton
								v-if="currentUser.role !== 'teacher'"
								label="Als Lehrer"
								color="neutral"
								variant="outline"
								size="sm"
								@click="() => setUserRole('teacher')"
							/>
						</template>
					</div>
				</div>
				<div
					v-else
					class="rounded-md border border-default bg-default p-3 text-sm text-muted"
				>
					Kontowechsel und Rollenumschaltung sind nur in der Entwicklungsumgebung verfügbar.
				</div>
			</div>
		</template>
	</UDashboardPanel>
	-->
</template>
