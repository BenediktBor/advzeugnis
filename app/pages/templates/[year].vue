<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const year = computed(() => route.params.year as string)
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
				<ul class="space-y-1">
					<li v-for="y in years" :key="y">
						<ULink
							:to="`/templates/${y}`"
							class="text-primary hover:underline"
							:class="{ 'font-medium': year === String(y) }"
						>
							{{ y }}
						</ULink>
					</li>
				</ul>
			</div>
		</template>
	</UDashboardPanel>
	<UDashboardPanel id="templates-detail" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar :title="`Vorlagen bearbeiten ${year}`" />
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<p class="text-muted">
					Satzbibliotheken für Jahrgang {{ year }} bearbeiten
					(Platzhalter).
				</p>
				<div
					class="min-h-32 rounded-md border border-default bg-default p-4 text-sm text-muted"
				>
					Platzhalter für Satzbibliothek-Editor
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
