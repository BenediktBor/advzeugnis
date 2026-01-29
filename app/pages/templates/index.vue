<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const years = useTemplateYears()
</script>

<template>
	<UDashboardPanel id="templates-list" resizable>
		<template #header>
			<UDashboardNavbar title="Vorlagen">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-2">
				<p class="text-sm text-muted">
					Satzvorlagen pro Jahrgang (Platzhalter)
				</p>
				<ul class="space-y-1">
					<li v-for="year in years" :key="year">
						<ULink
							:to="`/templates/${year}`"
							class="text-primary hover:underline"
						>
							{{ year }}
						</ULink>
					</li>
				</ul>
			</div>
		</template>
	</UDashboardPanel>
	<UDashboardPanel id="templates-detail" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar title="Details" />
		</template>
		<template #body>
			<div class="flex flex-1 items-center justify-center text-muted">
				Wähle einen Jahrgang aus der Liste
			</div>
		</template>
	</UDashboardPanel>
</template>
