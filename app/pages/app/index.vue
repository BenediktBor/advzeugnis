<script setup lang="ts">
const { canEditTemplates } = useCurrentUser()
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
				<AppStateNotice
					v-if="!isLoaded"
					title="Daten werden geladen"
					icon="i-lucide-loader-2"
					loading
				/>
				<StorageLoadErrorAlert v-else-if="loadError" />
				<AppStateNotice
					v-else-if="!hasAnyTemplateSets"
					title="Zuerst Satzvorlagen anlegen"
					description="Satzvorlagen sind die Grundlage für spätere Zeugnisformulierungen. Importiere bestehende Vorlagen oder lege einen neuen Vorlagensatz an."
					icon="i-lucide-file-text"
					tone="primary"
				>
					<div class="flex flex-wrap justify-center gap-2">
						<TemplateImportExportActions
							:can-edit="canEditTemplates"
							:disabled="true"
						/>
						<UButton
							v-if="canEditTemplates"
							label="Vorlagensatz anlegen"
							to="/app/templates?create=1"
							icon="i-lucide-plus"
						/>
						<UButton
							label="Zu Vorlagen"
							to="/app/templates"
							icon="i-lucide-file-text"
							color="neutral"
							variant="outline"
						/>
					</div>
				</AppStateNotice>
				<div v-else class="flex flex-col gap-6">
					<div class="space-y-2">
						<h1 class="text-xl font-semibold text-highlighted">
							Willkommen bei AdvancedZeugnis
						</h1>
						<p class="max-w-2xl text-muted">
							Erstelle Zeugnisformulierungen in drei Schritten: Vorlagen vorbereiten,
							Schüler anlegen und den fertigen Text kopieren.
						</p>
					</div>
					<div class="grid gap-3 md:grid-cols-3">
						<UCard variant="soft">
							<div class="flex flex-col gap-2">
								<UBadge label="1" class="w-fit" />
								<h2 class="font-medium text-default">Vorlagen vorbereiten</h2>
								<p class="text-sm text-muted">
									Lege Satzvorlagen an oder importiere bestehende `.azset`-Dateien.
								</p>
								<UButton
									label="Zu den Vorlagen"
									to="/app/templates"
									icon="i-lucide-file-text"
									color="neutral"
									variant="outline"
									class="mt-2 w-fit"
								/>
							</div>
						</UCard>
						<UCard variant="soft">
							<div class="flex flex-col gap-2">
								<UBadge label="2" class="w-fit" />
								<h2 class="font-medium text-default">Schüler anlegen</h2>
								<p class="text-sm text-muted">
									Wähle Name, Geschlecht und passende Vorlage für jeden Schüler.
								</p>
								<UButton
									label="Zur Schülerliste"
									to="/app/students"
									icon="i-lucide-users"
									color="neutral"
									variant="outline"
									class="mt-2 w-fit"
								/>
							</div>
						</UCard>
						<UCard variant="soft">
							<div class="flex flex-col gap-2">
								<UBadge label="3" class="w-fit" />
								<h2 class="font-medium text-default">Text auswählen und kopieren</h2>
								<p class="text-sm text-muted">
									Wähle Stufen und Varianten aus. Die Textausgabe aktualisiert sich automatisch.
								</p>
							</div>
						</UCard>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
