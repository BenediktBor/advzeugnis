<script setup lang="ts">
const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const { orderedIds, defaultAlphabeticalTemplateSetId } = useTemplateSets()
const { createStudentAndOpen } = useCreateStudentFlow()

const name = ref('')
const surname = ref('')
const gender = ref<'male' | 'female'>('male')
const templateSetId = ref('')

const canSubmit = computed(
	() => name.value.trim() !== '' && templateSetId.value.trim() !== ''
)

const isOpen = computed({
	get: () => props.open,
	set: (value: boolean) => emit('update:open', value),
})

function resetForm() {
	name.value = ''
	surname.value = ''
	gender.value = 'male'
	templateSetId.value = defaultAlphabeticalTemplateSetId.value
}

async function confirmCreateStudent() {
	if (!canSubmit.value) return
	await createStudentAndOpen({
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
		if (open) resetForm()
	}
)

watch(orderedIds, () => {
	if (!templateSetId.value || !orderedIds.value.includes(templateSetId.value)) {
		templateSetId.value = defaultAlphabeticalTemplateSetId.value
	}
})
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Schüler anlegen"
		description="Erfasse die Stammdaten und wähle den passenden Vorlagensatz."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<StudentStammdatenDialogBody
				:name="name"
				:surname="surname"
				:gender="gender"
				:template-set-id="templateSetId"
				hero-icon="i-lucide-user-plus"
				hero-title="Neuer Schülerdatensatz"
				hero-description="Der Datensatz wird erst angelegt, wenn ein Vorname und eine Vorlage gewählt sind."
				name-field-name="create-student-name"
				surname-field-name="create-student-surname"
				gender-field-name="create-student-gender"
				template-field-name="create-student-template"
				name-placeholder="z. B. Mia"
				surname-placeholder="z. B. Müller"
				submit-on-enter
				@update:name="name = $event"
				@update:surname="surname = $event"
				@update:gender="gender = $event"
				@update:template-set-id="templateSetId = $event"
				@submit="confirmCreateStudent"
			/>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton
				label="Anlegen und bearbeiten"
				icon="i-lucide-user-plus"
				:disabled="!canSubmit"
				@click="confirmCreateStudent"
			/>
		</template>
	</UModal>
</template>
