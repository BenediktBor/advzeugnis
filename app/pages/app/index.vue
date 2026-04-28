<script setup lang="ts">
const { hasAnyTemplateSets, isLoaded, loadError } = useTemplateSets()
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Übersicht">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<StorageLoadErrorAlert v-if="isLoaded && loadError" />
				<div
					v-else-if="isLoaded && !hasAnyTemplateSets"
					class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
				>
					<p class="font-medium text-default">
						Zuerst Satzvorlagen anlegen
					</p>
					<p class="mt-1 text-muted">
						Lege unter Vorlagen einen Vorlagensatz an oder importiere
						bestehende Satzvorlagen, bevor du Schüler anlegst.
					</p>
					<UButton
						label="Zu Vorlagen"
						to="/app/templates"
						class="mt-3"
						icon="i-lucide-file-text"
					/>
				</div>
				<h1 class="text-xl font-semibold text-highlighted">
					Willkommen bei AdvancedZeugnis
				</h1>
				<p class="text-muted">
					Nutze die Sidebar, um Schüler und Jahrgangs-Satzvorlagen zu
					verwalten.
				</p>
				<ULink to="/app/students" class="text-primary hover:underline">
					Zur Schülerliste
				</ULink>
				<ULink to="/app/templates" class="text-primary hover:underline">
					Zu den Vorlagen
				</ULink>
			</div>
		</template>
	</UDashboardPanel>
</template>
