<script setup lang="ts">
import {
	buildGradeAverageSummary,
	buildSelectionCoverageSummary,
} from '~/utils/reportText'
import StudentCreateModal from '~/components/StudentCreateModal.vue'
import { studentFullName } from '~/utils/student'

const { students, isLoaded: studentsLoaded, loadError: studentsLoadError } = useStudents()
const {
	setsWithData,
	getSetLabel,
	getSetData,
	hasAnyTemplateSets,
	isLoaded: templatesLoaded,
	loadError: templatesLoadError,
} = useTemplateSets()
const createStudentModalOpen = ref(false)

const searchQuery = ref('')
const filterTemplateSet = ref<string | null>(null)
const filterGender = ref<'male' | 'female' | null>(null)
const filterStatus = ref<'finished' | 'unfinished' | null>(null)

const templateSetItems = computed(() => [
	{ label: 'Alle Vorlagen', value: null as string | null },
	...setsWithData.value.map((setItem) => ({ label: setItem.label, value: setItem.id })),
])

const genderItems = [
	{ label: 'Alle', value: null as 'male' | 'female' | null },
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]

const statusItems = [
	{ label: 'Alle', value: null as 'finished' | 'unfinished' | null },
	{ label: 'Alle Kategorien aktiv', value: 'finished' as const },
	{ label: 'Mit deaktivierten Kategorien', value: 'unfinished' as const },
]

function genderLabel(gender: 'male' | 'female') {
	return gender === 'male' ? 'Männlich' : 'Weiblich'
}

function formatAverage(value: number): string {
	return value.toLocaleString('de-DE', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})
}

const studentCards = computed(() =>
	students.value.map((student) => {
		const templateSet = getSetData(student.templateSetId)
		const averageSummary = templateSet
			? buildGradeAverageSummary(student, templateSet)
			: null
		const coverageSummary = templateSet
			? buildSelectionCoverageSummary(student, templateSet)
			: null
		return { student, averageSummary, coverageSummary }
	})
)

const filteredStudentCards = computed(() => {
	let list = [...studentCards.value]
	const q = searchQuery.value.trim().toLowerCase()
	if (q) {
		list = list.filter(({ student }) => studentFullName(student).toLowerCase().includes(q))
	}
	if (filterTemplateSet.value !== null) {
		list = list.filter(
			({ student }) => student.templateSetId === filterTemplateSet.value
		)
	}
	if (filterGender.value !== null) {
		list = list.filter(({ student }) => student.gender === filterGender.value)
	}
	if (filterStatus.value !== null) {
		list = list.filter(({ coverageSummary }) =>
			filterStatus.value === 'finished'
				? coverageSummary?.isFinished === true
				: coverageSummary?.isFinished !== true
		)
	}
	return list
})

const hasActiveFilters = computed(
	() =>
		searchQuery.value.trim() !== '' ||
		filterTemplateSet.value !== null ||
		filterGender.value !== null ||
		filterStatus.value !== null
)

function resetFilters() {
	searchQuery.value = ''
	filterTemplateSet.value = null
	filterGender.value = null
	filterStatus.value = null
}

function onAddStudent() {
	createStudentModalOpen.value = true
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
									<UFormField
										label="Auswahlstatus"
										name="filter-status"
									>
										<USelectMenu
											v-model="filterStatus"
											:items="statusItems"
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
				>
					<AppStateNotice
						title="Schüler und Vorlagen werden geladen"
						icon="i-lucide-loader-2"
						loading
					/>
				</div>
				<StorageLoadErrorAlert v-else-if="loadError" />
				<AppStateNotice
					v-else-if="!hasAnyTemplateSets"
					title="Zuerst Satzvorlagen anlegen"
					description="Lege zuerst Satzvorlagen unter Vorlagen an, bevor du Schüler anlegst."
					icon="i-lucide-file-text"
					tone="primary"
				>
					<UButton
						label="Zu Vorlagen"
						to="/app/templates"
						icon="i-lucide-file-text"
					/>
				</AppStateNotice>
				<div
					v-if="hasAnyTemplateSets && filteredStudentCards.length"
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					<ULink
						v-for="card in filteredStudentCards"
						:key="card.student.id"
						:to="`/app/students/${card.student.id}`"
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
											<UIcon name="i-lucide-user" class="size-5" />
										</div>
										<div class="min-w-0">
											<div class="truncate font-semibold text-highlighted">
												{{ studentFullName(card.student) }}
											</div>
											<div class="mt-1 text-xs text-muted">
												Schülerprofil bearbeiten
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
										Schülerdaten
									</div>
									<div class="flex flex-wrap gap-2">
										<span
											class="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-default bg-elevated px-2.5 py-1 text-xs font-medium text-default"
										>
											<UIcon
												name="i-lucide-file-text"
												class="size-3.5 shrink-0 text-muted"
												aria-hidden="true"
											/>
											<span class="truncate">
												{{ getSetLabel(card.student.templateSetId) || 'Unbekannt' }}
											</span>
										</span>
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-default bg-elevated px-2.5 py-1 text-xs font-medium text-default"
										>
											<UIcon
												name="i-lucide-venus-and-mars"
												class="size-3.5 shrink-0 text-muted"
												aria-hidden="true"
											/>
											{{ genderLabel(card.student.gender) }}
										</span>
									</div>
								</div>

								<div class="grid grid-cols-1 gap-2">
									<div
										v-if="card.coverageSummary"
										class="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-default bg-muted/30 p-3"
									>
										<div class="min-w-0">
											<div class="font-medium text-default">Auswahlstatus</div>
											<div class="text-xs text-muted">
												{{ card.coverageSummary.completed }} von
												{{ card.coverageSummary.total }} Kategorien aktiv
											</div>
										</div>
										<CategoryProgressCircle
											class="shrink-0"
											:value="card.coverageSummary.completed"
											:total="card.coverageSummary.total"
											:label="`${card.coverageSummary.completed} aktiv, ${card.coverageSummary.total - card.coverageSummary.completed} deaktiviert`"
											below-label="Kategorien"
											:tone="card.coverageSummary.isFinished ? 'success' : 'primary'"
										/>
									</div>

									<div
										v-if="card.averageSummary"
										class="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-default bg-muted/30 p-3"
									>
										<div class="min-w-0">
											<div class="font-medium text-default">Notendurchschnitt</div>
											<div class="text-xs text-muted">
												{{ card.averageSummary.count }} Noten gewertet
											</div>
										</div>
										<CategoryProgressCircle
											class="shrink-0"
											:value="Math.round(card.averageSummary.progress * 100)"
											:total="100"
											:display-value="formatAverage(card.averageSummary.average)"
											:label="`Notendurchschnitt ${formatAverage(card.averageSummary.average)}`"
											below-label="Ø Note"
											tone="success"
										/>
									</div>
									<p v-else class="text-xs text-muted">
										Notendurchschnitt ist noch nicht verfügbar.
									</p>
								</div>
							</div>
						</UCard>
					</ULink>
				</div>
				<AppStateNotice
					v-else-if="hasAnyTemplateSets && !students.length"
					title="Noch keine Schüler"
					description="Lege einen Schüler an, um mit der Textauswahl zu starten."
					icon="i-lucide-user-plus"
				>
					<UButton
						label="Schüler anlegen"
						icon="i-lucide-plus"
						@click="onAddStudent"
					/>
				</AppStateNotice>
				<AppStateNotice
					v-else-if="
						hasAnyTemplateSets &&
						students.length &&
						!filteredStudentCards.length
					"
					title="Keine Schüler entsprechen den Filtern"
					description="Passe die Suche oder Filter an, um wieder Schüler zu sehen."
					icon="i-lucide-search-x"
				>
					<UButton
						v-if="hasActiveFilters"
						label="Filter zurücksetzen"
						color="neutral"
						variant="outline"
						size="sm"
						@click="resetFilters"
					/>
				</AppStateNotice>
			</div>
		</template>
	</UDashboardPanel>
	<StudentCreateModal v-model:open="createStudentModalOpen" />
</template>
