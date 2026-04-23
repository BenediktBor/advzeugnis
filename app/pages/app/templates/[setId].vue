<script setup lang="ts">
import { useLoadedMissingRedirect } from '~/composables/useLoadedMissingRedirect'

const route = useRoute()
const setId = computed(() => (route.params.setId as string) ?? '')

const { orderedIds, isLoaded } = useTemplateSets()
const { getSet } = useTemplates(setId)

const existsTemplateSet = computed(() => orderedIds.value.includes(setId.value))
const templateSet = computed(() => getSet())

useLoadedMissingRedirect({
	id: setId,
	isLoaded,
	exists: existsTemplateSet,
	redirectTo: '/app/templates',
})
</script>

<template>
	<TemplateEditorWorkspace v-if="templateSet" :set-id="setId" :template-set="templateSet" />

	<UDashboardPanel v-else>
		<template #header>
			<UDashboardNavbar title="Vorlagen">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex min-h-64 items-center justify-center text-sm text-muted">
				{{ isLoaded ? 'Vorlage wird vorbereitet…' : 'Vorlagen werden geladen…' }}
			</div>
		</template>
	</UDashboardPanel>
</template>
