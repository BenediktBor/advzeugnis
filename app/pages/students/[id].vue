<script setup lang="ts">
import type { Student } from '~/composables/useStudents'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { students, updateStudent, deleteStudent } = useStudents()
const years = useTemplateYears()

const deleteModalOpen = ref(false)

const student = computed(() => students.value.find((s) => s.id === id.value))

function studentFullName(s: { name: string; surname: string }) {
	return [s.name, s.surname].filter(Boolean).join(' ') || 'Unbenannt'
}

function onFieldUpdate(
	field: keyof Omit<Student, 'id'>,
	value: string | number,
) {
	if (!id.value) return
	updateStudent(id.value, { [field]: value })
}

const genderOptions = [
	{ value: 'male', label: 'Männlich' },
	{ value: 'female', label: 'Weiblich' },
]

const yearTabItems = computed(() =>
	years.value.map((y) => ({ label: String(y), value: y })),
)

const textOutputContent = computed(() => {
	const s = student.value
	if (!s) return ''
	const name = studentFullName(s)
	const year = s.templateYear
	return `Zeugnistext für ${name} — ${year}.\n(Generierte Ausgabe erscheint hier.)`
})

const toast = useToast()

async function copyTextOutput() {
	try {
		await navigator.clipboard.writeText(textOutputContent.value)
		toast.add({
			title: 'In Zwischenablage kopiert',
			color: 'success',
		})
	} catch {
		toast.add({
			title: 'Kopieren fehlgeschlagen',
			color: 'error',
		})
	}
}

function onEnhanceWithAI() {
	toast.add({
		title: 'Demnächst',
		description: 'KI-Verbesserung wird bald verfügbar sein.',
		color: 'neutral',
	})
}

function confirmDeleteStudent() {
	if (!id.value || !student.value) return
	deleteStudent(id.value)
	router.push('/students')
	deleteModalOpen.value = false
}
</script>

<template>
	<!-- First panel: student edit form -->
	<UDashboardPanel id="students-list" resizable>
		<template #header>
			<UDashboardNavbar
				:title="
					student
						? studentFullName(student)
						: `Schüler bearbeiten ${id}`
				"
			>
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton
						v-if="student"
						label="Löschen"
						icon="i-lucide-trash-2"
						color="error"
						variant="ghost"
						aria-label="Schüler löschen"
						@click="deleteModalOpen = true"
					/>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div v-if="!student" class="flex flex-col gap-4">
				<p class="text-muted">Schüler nicht gefunden.</p>
				<ULink to="/students" class="text-primary hover:underline">
					Zurück zur Schülerliste
				</ULink>
			</div>
			<div v-else class="flex flex-col gap-4">
				<UTabs
					:items="yearTabItems"
					:model-value="student.templateYear"
					:content="false"
					class="w-full"
					@update:model-value="
						(v) =>
							onFieldUpdate(
								'templateYear',
								(v as number) ?? years.value[0],
							)
					"
				/>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<UFormField label="Vorname" name="student-name">
						<UInput
							id="student-name"
							:model-value="student.name"
							placeholder="Vorname"
							@update:model-value="
								(v) => onFieldUpdate('name', v ?? '')
							"
						/>
					</UFormField>
					<UFormField label="Nachname" name="student-surname">
						<UInput
							id="student-surname"
							:model-value="student.surname"
							placeholder="Nachname"
							@update:model-value="
								(v) => onFieldUpdate('surname', v ?? '')
							"
						/>
					</UFormField>
				</div>
				<UFormField label="Geschlecht" name="student-gender">
					<USelectMenu
						id="student-gender"
						:model-value="student.gender"
						:items="genderOptions"
						value-key="value"
						@update:model-value="
							(v) => onFieldUpdate('gender', v ?? 'male')
						"
					/>
				</UFormField>
			</div>
		</template>
	</UDashboardPanel>
	<!-- Second panel: Text Output -->
	<UDashboardPanel id="students-detail" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar title="Textausgabe">
				<template #right>
					<UButton
						label="Kopieren"
						icon="i-lucide-copy"
						color="neutral"
						variant="ghost"
						aria-label="Textausgabe in Zwischenablage kopieren"
						@click="copyTextOutput"
					/>
					<UButton
						label="Mit KI verbessern"
						icon="i-lucide-sparkles"
						color="neutral"
						variant="ghost"
						aria-label="Text mit KI verbessern"
						@click="onEnhanceWithAI"
					/>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col flex-1 min-h-0 gap-2">
				<UFormField
					label="Textausgabe"
					name="text-output"
					class="flex-1 min-h-0 flex flex-col"
				>
					<textarea
						:id="'text-output'"
						:value="textOutputContent"
						readonly
						class="flex-1 min-h-[200px] w-full resize-none rounded-md border border-default bg-default px-3 py-2 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</UFormField>
			</div>
		</template>
	</UDashboardPanel>
	<UModal
		v-model:open="deleteModalOpen"
		title="Schüler löschen"
		:description="
			student
				? `Möchtest du ${studentFullName(student)} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
				: ''
		"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer="{ close }">
			<UButton
				label="Abbrechen"
				color="neutral"
				variant="outline"
				@click="close()"
			/>
			<UButton
				label="Löschen"
				color="error"
				@click="confirmDeleteStudent"
			/>
		</template>
	</UModal>
</template>
