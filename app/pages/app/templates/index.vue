<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { setsWithData, addSet, isLoaded, loadError } = useTemplateSets()
const { canEditTemplates: canEdit } = useCurrentUser()
const hasTemplateSets = computed(() => setsWithData.value.length > 0)

const addModalOpen = ref(false)
const addModalLabel = ref('')

function openAddModal() {
	addModalLabel.value = ''
	addModalOpen.value = true
}

function confirmAddSet() {
	const label = addModalLabel.value.trim()
	if (!label) return
	addModalOpen.value = false
	const newId = addSet(label)
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
				<AppStateNotice
					v-if="!isLoaded"
					title="Vorlagen werden geladen"
					icon="i-lucide-loader-2"
					loading
				/>
				<StorageLoadErrorAlert v-else-if="loadError" />
				<AppStateNotice
					v-else-if="!hasTemplateSets"
					title="Noch keine Vorlagen vorhanden"
					description="Lege einen Vorlagensatz an oder importiere bestehende `.azset`-Dateien, damit du Satzvorlagen pflegen kannst."
					icon="i-lucide-file-plus"
					tone="primary"
				>
					<UButton
						v-if="canEdit"
						label="Vorlagensatz anlegen"
						icon="i-lucide-plus"
						@click="openAddModal"
					/>
					<TemplateImportExportActions
						:can-edit="canEdit"
						:disabled="!hasTemplateSets"
					/>
				</AppStateNotice>
				<div
					v-else
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					<ULink
						v-for="item in setsWithData"
						:key="item.id"
						:to="`/app/templates/${item.id}`"
						class="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
					>
						<UCard
							variant="soft"
							class="h-full overflow-hidden border border-default bg-default/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
						>
							<template #header>
								<div class="flex items-start justify-between gap-3">
									<div class="flex min-w-0 items-start gap-3">
										<div
											class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
											aria-hidden="true"
										>
											<UIcon name="i-lucide-files" class="size-5" />
										</div>
										<div class="min-w-0">
											<div class="truncate font-semibold text-highlighted">
												{{ item.label }}
											</div>
											<div class="mt-1 text-xs text-muted">
												Vorlagensatz bearbeiten
											</div>
										</div>
									</div>
									<UIcon
										name="i-lucide-arrow-right"
										class="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
										aria-hidden="true"
									/>
								</div>
							</template>
							<div class="flex flex-col gap-4 text-sm">
								<div class="space-y-2">
									<div class="text-xs font-medium uppercase tracking-wide text-muted">
										Enthaltene Fächer
									</div>
									<div
										v-if="item.subjectPreview.length"
										class="flex flex-wrap gap-2"
									>
										<span
											v-for="subject in item.subjectPreview"
											:key="subject"
											class="max-w-full truncate rounded-full border border-default bg-elevated px-2.5 py-1 text-xs font-medium text-default"
										>
											{{ subject }}
										</span>
										<span
											v-if="item.remainingSubjectCount"
											class="rounded-full border border-default px-2.5 py-1 text-xs text-muted"
										>
											+{{ item.remainingSubjectCount }} weitere
										</span>
									</div>
									<div
										v-else
										class="rounded-lg border border-dashed border-default px-3 py-2 text-xs text-muted"
									>
										Noch keine Fächer angelegt.
									</div>
								</div>

								<div class="grid grid-cols-2 gap-2">
									<div class="rounded-lg border border-default bg-muted/30 p-3">
										<div class="text-lg font-semibold text-highlighted">
											{{ item.subjectCount }}
										</div>
										<div class="text-xs text-muted">Fächer</div>
									</div>
									<div class="rounded-lg border border-default bg-muted/30 p-3">
										<div class="text-lg font-semibold text-highlighted">
											{{ item.categoryCount }}
										</div>
										<div class="text-xs text-muted">Kategorien</div>
									</div>
									<div class="rounded-lg border border-default bg-muted/30 p-3">
										<div class="text-lg font-semibold text-highlighted">
											{{ item.gradeCount }}
										</div>
										<div class="text-xs text-muted">Notenstufen</div>
									</div>
									<div class="rounded-lg border border-default bg-muted/30 p-3">
										<div class="text-lg font-semibold text-highlighted">
											{{ item.variantCount }}
										</div>
										<div class="text-xs text-muted">Textvarianten</div>
									</div>
								</div>
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
