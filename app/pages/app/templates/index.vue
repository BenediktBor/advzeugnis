<script setup lang="ts">
import type { TemplateSetCreationMode } from '~/stores/templates'

const route = useRoute()
const router = useRouter()
const { setsWithData, addSet, isLoaded } = useTemplateSets()
const { canEditTemplates: canEdit } = useCurrentUser()
const hasTemplateSets = computed(() => setsWithData.value.length > 0)

const addModalOpen = ref(false)
const addModalLabel = ref('')
const addModalMode = ref<TemplateSetCreationMode>('starter')
const addModeItems = [
	{ value: 'starter', label: 'Mit Standardstruktur starten' },
	{ value: 'empty', label: 'Leere Vorlage erstellen' },
]

function setAddModalMode(mode: TemplateSetCreationMode = 'starter') {
	addModalLabel.value = ''
	addModalMode.value = mode
}

function openAddModal() {
	setAddModalMode()
	addModalOpen.value = true
}

function confirmAddSet() {
	const label = addModalLabel.value.trim()
	if (!label) return
	addModalOpen.value = false
	const newId = addSet(label, addModalMode.value)
	if (newId) router.push(`/app/templates/${newId}`)
}

function consumeCreateQuery() {
	const query = { ...route.query }
	delete query.create
	void router.replace({ path: route.path, query })
}

watch(
	() => route.query.create,
	(createQuery) => {
		const shouldOpen = Array.isArray(createQuery)
			? createQuery.includes('1')
			: createQuery === '1'
		if (!shouldOpen) return
		if (canEdit.value) openAddModal()
		consumeCreateQuery()
	},
	{ immediate: true },
)
</script>

<template>
	<UDashboardPanel id="templates-list" resizable>
		<template #header>
			<UDashboardNavbar title="Vorlagen">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<div class="flex items-center gap-2">
						<TemplateImportExportActions
							:can-edit="canEdit"
							:disabled="!hasTemplateSets"
						/>
						<UButton
							v-if="canEdit"
							label="Vorlagensatz anlegen"
							icon="i-lucide-plus"
							@click="openAddModal"
						/>
					</div>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<p class="text-sm text-muted shrink-0">
					Satzvorlagen pro Jahrgang oder Schulstufe.
				</p>
				<p v-if="!canEdit" class="text-xs text-muted shrink-0">
					Nur für Benutzer mit Rolle Editor oder Admin bearbeitbar.
				</p>
				<div
					v-if="!isLoaded"
					class="rounded-lg border border-default bg-default p-4 text-sm text-muted"
				>
					Vorlagen werden geladen…
				</div>
				<div
					v-else-if="!hasTemplateSets"
					class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
				>
					<p class="font-medium text-default">Noch keine Vorlagen vorhanden</p>
					<p class="mt-1 text-muted">
						Lege einen Vorlagensatz an oder importiere bestehende `.advzeu`-Dateien,
						damit du Satzvorlagen pflegen kannst.
					</p>
					<UButton
						v-if="canEdit"
						label="Vorlagensatz anlegen"
						icon="i-lucide-plus"
						class="mt-3"
						@click="openAddModal"
					/>
				</div>
				<div
					v-else
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					<ULink
						v-for="item in setsWithData"
						:key="item.id"
						:to="`/app/templates/${item.id}`"
						class="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
					>
						<UCard
							variant="soft"
							class="h-full transition-opacity hover:opacity-90"
						>
							<template #header>
								<span class="font-semibold text-highlighted">
									{{ item.label }}
								</span>
							</template>
							<div class="flex flex-col gap-2 text-sm text-muted">
								<template v-if="item.subjects.length">
									<div
										v-for="(subject, i) in item.subjects"
										:key="i"
									>
										{{ subject }}
									</div>
								</template>
								<p v-else class="text-muted">Keine Fächer</p>
							</div>
						</UCard>
					</ULink>
				</div>
			</div>
		</template>
	</UDashboardPanel>

	<UModal v-model:open="addModalOpen">
		<template #content>
			<div class="p-4 flex flex-col gap-4">
				<h3 class="font-semibold text-highlighted">
					Neuen Vorlagensatz anlegen
				</h3>
				<p class="text-sm text-muted">
					Ein Vorlagensatz fasst Fächer, Kategorien und Satzbausteine pro
					Jahrgang oder Schulstufe zusammen.
				</p>
				<UFormField label="Start" name="add-set-mode">
					<UTabs
						:items="addModeItems"
						v-model="addModalMode"
						:content="false"
						class="w-full"
					/>
					<p class="mt-2 text-xs text-muted">
						{{
							addModalMode === 'starter'
								? 'Erstellt direkt ein Fach mit einer Kategorie, Notenstufe und Variante.'
								: 'Startet ohne Inhalte, damit du deine Struktur komplett selbst aufbauen kannst.'
						}}
					</p>
				</UFormField>
				<UFormField label="Bezeichnung" name="add-set-label">
					<UInput
						v-model="addModalLabel"
						placeholder="z. B. Klasse 5"
						autofocus
						@keydown.enter.prevent="confirmAddSet"
					/>
				</UFormField>
				<div class="flex justify-end gap-2">
					<UButton
						label="Abbrechen"
						color="neutral"
						variant="ghost"
						@click="addModalOpen = false"
					/>
					<UButton
						label="Anlegen"
						icon="i-lucide-plus"
						:disabled="!addModalLabel.trim()"
						@click="confirmAddSet"
					/>
				</div>
			</div>
		</template>
	</UModal>

</template>
