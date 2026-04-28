<script setup lang="ts">
import { useLoadedMissingRedirect } from '~/composables/useLoadedMissingRedirect'

const route = useRoute()
const setId = computed(() => (route.params.setId as string) ?? '')

const { orderedIds, isLoaded, loadError } = useTemplateSets()
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
			<div v-if="loadError" class="p-4">
				<StorageLoadErrorAlert />
			</div>
			<div v-else class="p-4">
				<AppStateNotice
					:title="isLoaded ? 'Vorlage wird vorbereitet' : 'Vorlagen werden geladen'"
					icon="i-lucide-loader-2"
					loading
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
