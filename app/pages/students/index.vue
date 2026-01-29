<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const router = useRouter()
const { students, addStudent } = useStudents()
const years = useTemplateYears()

const searchQuery = ref('')
const filterYear = ref<number | null>(null)
const filterGender = ref<'male' | 'female' | null>(null)
const filterGrade = ref<null>(null)

const yearItems = computed(() => [
	{ label: 'Alle Jahrgänge', value: null as number | null },
	...years.value.map((y) => ({ label: String(y), value: y })),
])

const genderItems = [
	{ label: 'Alle', value: null as 'male' | 'female' | null },
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]

const gradeItems = [{ label: 'Alle', value: null }]

function studentFullName(s: { name: string; surname: string }) {
	return [s.name, s.surname].filter(Boolean).join(' ') || 'Unbenannt'
}

function genderLabel(gender: 'male' | 'female') {
	return gender === 'male' ? 'Männlich' : 'Weiblich'
}

const filteredStudents = computed(() => {
	let list = [...students.value]
	const q = searchQuery.value.trim().toLowerCase()
	if (q) {
		list = list.filter((s) => studentFullName(s).toLowerCase().includes(q))
	}
	if (filterYear.value !== null) {
		list = list.filter((s) => s.templateYear === filterYear.value)
	}
	if (filterGender.value !== null) {
		list = list.filter((s) => s.gender === filterGender.value)
	}
	return list
})

const hasActiveFilters = computed(
	() =>
		searchQuery.value.trim() !== '' ||
		filterYear.value !== null ||
		filterGender.value !== null,
)

function resetFilters() {
	searchQuery.value = ''
	filterYear.value = null
	filterGender.value = null
	filterGrade.value = null
}

function onAddStudent() {
	const defaultYear = years.value[0] ?? 2024
	const newId = addStudent({
		name: '',
		surname: '',
		gender: 'male',
		templateYear: defaultYear,
	})
	router.push(`/students/${newId}`)
}
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
										label="Schuljahr"
										name="filter-year"
									>
										<USelectMenu
											v-model="filterYear"
											:items="yearItems"
											value-key="value"
											placeholder="Alle Jahrgänge"
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
									<UFormField
										label="Notendurchschnitt"
										name="filter-grade"
									>
										<USelectMenu
											v-model="filterGrade"
											:items="gradeItems"
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
				<p class="text-sm text-muted shrink-0">
					Klassendurchschnitt: —
				</p>
				<div
					v-if="filteredStudents.length"
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					<ULink
						v-for="s in filteredStudents"
						:key="s.id"
						:to="`/students/${s.id}`"
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
										>Schuljahr
									</span>
									{{ s.templateYear }}
								</div>
								<div>
									<span class="font-medium text-default"
										>Geschlecht
									</span>
									{{ genderLabel(s.gender) }}
								</div>
								<div>
									<span class="font-medium text-default"
										>Notendurchschnitt
									</span>
									—
								</div>
							</div>
						</UCard>
					</ULink>
				</div>
				<p v-if="!students.length" class="text-sm text-muted">
					Noch keine Schüler. Lege einen an, um zu starten.
				</p>
				<p
					v-else-if="!filteredStudents.length"
					class="text-sm text-muted"
				>
					Keine Schüler entsprechen den Filtern.
				</p>
			</div>
		</template>
	</UDashboardPanel>
</template>
