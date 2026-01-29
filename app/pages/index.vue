<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
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
				<h1 class="text-xl font-semibold text-highlighted">
					Willkommen bei AdvancedZeugnis
				</h1>
				<p class="text-muted">
					Nutze die Sidebar, um Schüler und Jahrgangs-Satzvorlagen zu
					verwalten.
				</p>
				<ULink to="/students" class="text-primary hover:underline">
					Zur Schülerliste
				</ULink>
				<ULink to="/templates" class="text-primary hover:underline">
					Zu den Vorlagen
				</ULink>
			</div>
		</template>
	</UDashboardPanel>
</template>
