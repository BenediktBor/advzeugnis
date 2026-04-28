<script setup lang="ts">
import { studentFullName } from '~/utils/student'

const { students, isLoaded: studentsLoaded, loadError: studentsLoadError } = useStudents()
const {
	setsWithData,
	getSetLabel,
	hasAnyTemplateSets,
	isLoaded: templatesLoaded,
	loadError: templatesLoadError,
} = useTemplateSets()
const { createStudentAndOpen } = useCreateStudentFlow()

const searchQuery = ref('')
const filterTemplateSet = ref<string | null>(null)
const filterGender = ref<'male' | 'female' | null>(null)

const templateSetItems = computed(() => [
	{ label: 'Alle Vorlagen', value: null as string | null },
	...setsWithData.value.map((setItem) => ({ label: setItem.label, value: setItem.id })),
])

const genderItems = [
	{ label: 'Alle', value: null as 'male' | 'female' | null },
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]

function genderLabel(gender: 'male' | 'female') {
	return gender === 'male' ? 'Männlich' : 'Weiblich'
}

const filteredStudents = computed(() => {
	let list = [...students.value]
	const q = searchQuery.value.trim().toLowerCase()
	if (q) {
		list = list.filter((s) => studentFullName(s).toLowerCase().includes(q))
	}
	if (filterTemplateSet.value !== null) {
		list = list.filter(
			(s) => s.templateSetId === filterTemplateSet.value
		)
	}
	if (filterGender.value !== null) {
		list = list.filter((s) => s.gender === filterGender.value)
	}
	return list
})

const hasActiveFilters = computed(
	() =>
		searchQuery.value.trim() !== '' ||
		filterTemplateSet.value !== null ||
		filterGender.value !== null
)

function resetFilters() {
	searchQuery.value = ''
	filterTemplateSet.value = null
	filterGender.value = null
}

function onAddStudent() {
	createStudentAndOpen()
}

const isLoaded = computed(() => studentsLoaded.value && templatesLoaded.value)
const loadError = computed(() => studentsLoadError.value ?? templatesLoadError.value)
</script>

<template>
	<UDashboardPanel id="students-list" resizable>
		<template #header>
			<UDashboardNavbar title="Schüler">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<div class="flex flex-wrap items-center gap-2">
						<UButton
							v-if="hasAnyTemplateSets"
							label="Schüler anlegen"
							icon="i-lucide-plus"
							@click="onAddStudent"
						/>
						<UInput
							v-model="searchQuery"
							placeholder="Nach Name suchen"
							icon="i-lucide-search"
							class="min-w-48"
						/>
						<UPopover :ui="{ content: 'p-4 w-72' }">
							<UButton
								label="Filter"
								:icon="
									hasActiveFilters
										? 'i-lucide-filter-x'
										: 'i-lucide-filter'
								"
								:color="
									hasActiveFilters ? 'primary' : 'neutral'
								"
								variant="outline"
							/>
							<template #content>
								<div class="flex flex-col gap-4">
									<UFormField
										label="Vorlage"
										name="filter-template-set"
									>
										<USelectMenu
											v-model="filterTemplateSet"
											:items="templateSetItems"
											value-key="value"
											placeholder="Alle Vorlagen"
											class="w-full"
										/>
									</UFormField>
									<UFormField
										label="Geschlecht"
										name="filter-gender"
									>
										<USelectMenu
											v-model="filterGender"
											:items="genderItems"
											value-key="value"
											placeholder="Alle"
											class="w-full"
										/>
									</UFormField>
									<UButton
										v-if="hasActiveFilters"
										label="Zurücksetzen"
										color="neutral"
										variant="ghost"
										size="sm"
										block
										@click="resetFilters"
									/>
								</div>
							</template>
						</UPopover>
					</div>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<div
					v-if="!isLoaded"
					class="rounded-lg border border-default bg-default p-4 text-sm text-muted"
				>
					Schüler und Vorlagen werden geladen…
				</div>
				<StorageLoadErrorAlert v-else-if="loadError" />
				<div
					v-else-if="!hasAnyTemplateSets"
					class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
				>
					<p class="font-medium text-default">
						Zuerst Satzvorlagen anlegen
					</p>
					<p class="mt-1 text-muted">
						Lege zuerst Satzvorlagen unter Vorlagen an, bevor du
						Schüler anlegst.
					</p>
					<UButton
						label="Zu Vorlagen"
						to="/app/templates"
						class="mt-3"
						icon="i-lucide-file-text"
					/>
				</div>
				<div
					v-if="hasAnyTemplateSets && filteredStudents.length"
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					<ULink
						v-for="s in filteredStudents"
						:key="s.id"
						:to="`/app/students/${s.id}`"
						class="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
					>
						<UCard
							variant="soft"
							class="h-full transition-opacity hover:opacity-90"
						>
							<template #header>
								<span class="font-semibold text-highlighted">
									{{ studentFullName(s) }}
								</span>
							</template>
							<div class="flex flex-col gap-2 text-sm text-muted">
								<div>
									<span class="font-medium text-default"
										>Vorlage
									</span>
									{{ getSetLabel(s.templateSetId) || 'Unbekannt' }}
								</div>
								<div>
									<span class="font-medium text-default"
										>Geschlecht
									</span>
									{{ genderLabel(s.gender) }}
								</div>
								<p class="text-xs text-muted">Notendurchschnitt ist noch nicht verfugbar.</p>
							</div>
						</UCard>
					</ULink>
				</div>
				<p
					v-else-if="hasAnyTemplateSets && !students.length"
					class="text-sm text-muted"
				>
					Noch keine Schüler. Lege einen an, um zu starten.
				</p>
				<p
					v-else-if="
						hasAnyTemplateSets &&
						students.length &&
						!filteredStudents.length
					"
					class="text-sm text-muted"
				>
					Keine Schüler entsprechen den Filtern.
				</p>
			</div>
		</template>
	</UDashboardPanel>
</template>
