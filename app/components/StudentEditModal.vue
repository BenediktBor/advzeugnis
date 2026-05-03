<script setup lang="ts">
import type { Student } from '~/types/student'
import type { GradeAverageSummary } from '~/utils/reportText'

const props = defineProps<{
	open: boolean
	student: Student | null
	gradeAverageSummary: GradeAverageSummary | null
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const { updateStudent } = useStudents()
const { setsWithData, orderedIds } = useTemplateSets()

const name = ref('')
const surname = ref('')
const gender = ref<'male' | 'female'>('male')
const templateSetId = ref('')

const templateSetItems = computed(() =>
	setsWithData.value.map((setItem) => ({
		label: setItem.label,
		value: setItem.id,
	}))
)

const isOpen = computed({
	get: () => props.open,
	set: (value: boolean) => emit('update:open', value),
})

const canSubmit = computed(
	() => name.value.trim() !== '' && templateSetId.value.trim() !== '' && props.student !== null
)

function resolvedTemplateIdForStudent(s: Student): string {
	if (orderedIds.value.includes(s.templateSetId)) return s.templateSetId
	return orderedIds.value[0] ?? s.templateSetId
}

function syncFromStudent() {
	const s = props.student
	if (!s) return
	name.value = s.name
	surname.value = s.surname
	gender.value = s.gender
	templateSetId.value = resolvedTemplateIdForStudent(s)
}

function confirmSave() {
	if (!canSubmit.value || !props.student) return
	updateStudent(props.student.id, {
		name: name.value,
		surname: surname.value,
		gender: gender.value,
		templateSetId: templateSetId.value,
	})
	isOpen.value = false
}

watch(
	() => props.open,
	(open) => {
		if (open) syncFromStudent()
	}
)

watch(
	() => props.student,
	() => {
		if (props.open) syncFromStudent()
	}
)

watch(orderedIds, () => {
	if (!templateSetId.value || !orderedIds.value.includes(templateSetId.value)) {
		templateSetId.value = orderedIds.value[0] ?? ''
	}
})
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Stammdaten bearbeiten"
		description="Passe Name, Geschlecht und Vorlagensatz für diesen Schüler an."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<StudentStammdatenDialogBody
				v-if="student"
				:name="name"
				:surname="surname"
				:gender="gender"
				:template-set-id="templateSetId"
				:template-set-items="templateSetItems"
				hero-icon="i-lucide-user-pen"
				hero-title="Schülerdatensatz bearbeiten"
				hero-description="Änderungen wirken sich auf die Zeugnistexte aus, sobald du sie speicherst."
				show-grade-summary
				:grade-average-summary="gradeAverageSummary"
				name-field-name="edit-student-name"
				surname-field-name="edit-student-surname"
				gender-field-name="edit-student-gender"
				template-field-name="edit-student-template"
				name-placeholder="z. B. Mia"
				surname-placeholder="z. B. Müller"
				@update:name="name = $event"
				@update:surname="surname = $event"
				@update:gender="gender = $event"
				@update:template-set-id="templateSetId = $event"
				@submit="confirmSave"
			/>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton
				label="Speichern"
				icon="i-lucide-save"
				:disabled="!canSubmit"
				@click="confirmSave"
			/>
		</template>
	</UModal>
</template>
