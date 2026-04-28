<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { Category, SentencePart, TemplateSet } from '~/types/template'

const props = defineProps<{
	setId: string
	templateSet: TemplateSet
}>()

const { removeSet } = useTemplateSets()
const deleteDialog = useConfirmDialog()
const {
	addSubject,
	deleteSubject,
	reorderSubject,
	addCategory,
	deleteCategory,
	reorderCategory,
	addGrade,
	deleteGrade,
	updateSubjectLabel,
	updateCategoryLabel,
	updateGradeLabel,
	updateGradeValue,
	addVariant,
	deleteVariant,
	updateVariantLabel,
	addSentencePart,
	updateSentencePart,
	deleteSentencePart,
	reorderSentenceParts,
} = useTemplates(computed(() => props.setId))
const { canEditTemplates } = useCurrentUser()

const selectedCategory = ref<{ subjectId: string; categoryId: string } | null>(null)
const selectedGradeId = ref<string | null>(null)
const selectedVariantId = ref<string | null>(null)

function getFirstCategorySelection(templateSet: TemplateSet) {
	for (const subject of templateSet.subjects) {
		const firstCategory = subject.categories[0]
		if (firstCategory) {
			return {
				subjectId: subject.id,
				categoryId: firstCategory.id,
			}
		}
	}

	return null
}

const selectedCategoryData = computed<Category | null>(() => {
	const selected = selectedCategory.value
	if (!selected) return null

	const subject = props.templateSet.subjects.find((item) => item.id === selected.subjectId)
	return subject?.categories.find((category) => category.id === selected.categoryId) ?? null
})

watch(
	selectedCategoryData,
	(category) => {
		if (category) return
		selectedGradeId.value = null
		selectedVariantId.value = null
	},
	{ immediate: true }
)

function selectCategory(category: { subjectId: string; categoryId: string } | null) {
	selectedCategory.value = category
	const selected = selectedCategoryData.value
	if (!selected?.grades.length) {
		selectedGradeId.value = null
		selectedVariantId.value = null
		return
	}

	const currentGrade = selected.grades.find((grade) => grade.id === selectedGradeId.value)
	const grade = currentGrade ?? selected.grades[0]
	if (!grade) {
		selectedGradeId.value = null
		selectedVariantId.value = null
		return
	}

	selectedGradeId.value = grade.id
	if (!grade.variants.length) {
		selectedVariantId.value = null
		return
	}

	const currentVariant = grade.variants.find((variant) => variant.id === selectedVariantId.value)
	selectedVariantId.value = currentVariant?.id ?? grade.variants[0]?.id ?? null
}

watch(
	() => props.setId,
	() => {
		selectedCategory.value = null
		selectedGradeId.value = null
		selectedVariantId.value = null
	}
)

watch(
	() => props.templateSet,
	() => {
		if (selectedCategory.value && selectedCategoryData.value) return
		const firstCategory = getFirstCategorySelection(props.templateSet)
		if (firstCategory) selectCategory(firstCategory)
	},
	{ immediate: true, deep: true },
)

watch(selectedGradeId, () => {
	const category = selectedCategoryData.value
	const grade = category?.grades.find((item) => item.id === selectedGradeId.value)
	if (!grade?.variants.length) {
		selectedVariantId.value = null
		return
	}

	const currentVariant = grade.variants.find((variant) => variant.id === selectedVariantId.value)
	selectedVariantId.value = currentVariant?.id ?? grade.variants[0]?.id ?? null
})

function gradeVariantTitle(category: Category): string {
	return `Noten & Varianten: ${category.label}`
}

function confirmDeleteLabel(label: string): string {
	return `Möchtest du „${label || 'Unbenannt'}" wirklich löschen?`
}

function addGradeAndSelect() {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	const gradeId = addGrade(subjectId, categoryId)
	nextTick(() => {
		selectedGradeId.value = gradeId
		const category = selectedCategoryData.value
		const grade = category?.grades.find((item) => item.id === gradeId)
		selectedVariantId.value = grade?.variants[0]?.id ?? null
	})
}

function addVariantAndSelect() {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	const variantId = addVariant(subjectId, categoryId, selectedGradeId.value)
	nextTick(() => {
		selectedVariantId.value = variantId
	})
}

function handleEditGradeLabel(gradeId: string, currentLabel: string, currentValue: number | undefined) {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditLabelModal(
		currentLabel,
		(label, value) => {
			updateGradeLabel(subjectId, categoryId, gradeId, label)
			updateGradeValue(subjectId, categoryId, gradeId, value ?? null)
		},
		{
			title: 'Notenstufe bearbeiten',
			supportsGradeValue: true,
			gradeValue: currentValue,
		}
	)
}

function handleDeleteGrade(gradeId: string, label: string) {
	if (!selectedCategory.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Notenstufe löschen?',
		description: confirmDeleteLabel(label),
		onConfirm: () => deleteGrade(subjectId, categoryId, gradeId),
	})
}

function handleEditVariantLabel(variantId: string, currentLabel: string) {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditLabelModal(
		currentLabel,
		(label) => updateVariantLabel(subjectId, categoryId, selectedGradeId.value!, variantId, label),
		{ title: 'Variante umbenennen' }
	)
}

function handleDeleteVariant(variantId: string, label: string) {
	if (!selectedCategory.value || !selectedGradeId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Variante löschen?',
		description: confirmDeleteLabel(label),
		onConfirm: () => deleteVariant(subjectId, categoryId, selectedGradeId.value!, variantId),
	})
}

function handleEditSentencePart(part: SentencePart, partIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	openEditPartModal(part, (_part) => {
		updateSentencePart(subjectId, categoryId, selectedGradeId.value!, selectedVariantId.value!, partIndex, _part)
	})
}

function handleDeleteSentencePart(partIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	const { subjectId, categoryId } = selectedCategory.value
	deleteDialog.show({
		title: 'Satzbaustein löschen?',
		description: 'Möchtest du diesen Baustein wirklich löschen?',
		onConfirm: () =>
			deleteSentencePart(
				subjectId,
				categoryId,
				selectedGradeId.value!,
				selectedVariantId.value!,
				partIndex,
			),
	})
}

function handleReorderSentenceParts(oldIndex: number, newIndex: number) {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value) return
	reorderSentenceParts(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		oldIndex,
		newIndex,
	)
}

const addPartModalOpen = ref(false)
const addPartType = ref<'text' | 'genderVariant' | 'name' | 'optionalText'>('text')
const addPartText = ref('')
const addPartMale = ref('')
const addPartFemale = ref('')
const addPartOptionalText = ref('')
const addPartOptionalEnabledByDefault = ref(true)
const addPartTabItems = [
	{ value: 'text' as const, label: 'Text' },
	{ value: 'genderVariant' as const, label: 'Variabler Text' },
	{ value: 'name' as const, label: 'Name' },
	{ value: 'optionalText' as const, label: 'Optionaler Text' },
]
const addPartHelp = computed(() => {
	if (addPartType.value === 'text') {
		return 'Fester Text erscheint immer genau so in der Textausgabe.'
	}
	if (addPartType.value === 'genderVariant') {
		return 'Variabler Text wechselt je nach Geschlecht des Schülers.'
	}
	if (addPartType.value === 'name') {
		return 'Name setzt den Schülernamen ein und kann später durch Pronomen ersetzt werden.'
	}
	return 'Optionaler Text kann in der Satzauswahl pro Schüler ein- oder ausgeblendet werden.'
})
const genderVariantPresets = [
	{ label: 'Er/Sie', male: 'Er', female: 'Sie' },
	{ label: 'er/sie', male: 'er', female: 'sie' },
	{ label: 'Ihn/Sie', male: 'Ihn', female: 'Sie' },
	{ label: 'ihn/sie', male: 'ihn', female: 'sie' },
]

function openAddPartModal() {
	addPartType.value = 'text'
	addPartText.value = ''
	addPartMale.value = ''
	addPartFemale.value = ''
	addPartOptionalText.value = ''
	addPartOptionalEnabledByDefault.value = true
	addPartModalOpen.value = true
}

function applyGenderVariantPreset(preset: (typeof genderVariantPresets)[number]) {
	addPartType.value = 'genderVariant'
	addPartMale.value = preset.male
	addPartFemale.value = preset.female
	confirmAddPart()
}

const canConfirmAddPart = computed(() => {
	if (addPartType.value === 'text') return addPartText.value.trim() !== ''
	if (addPartType.value === 'genderVariant') {
		return addPartMale.value.trim() !== '' && addPartFemale.value.trim() !== ''
	}
	if (addPartType.value === 'optionalText') return addPartOptionalText.value.trim() !== ''
	return true
})

function confirmAddPart() {
	if (!selectedCategory.value || !selectedGradeId.value || !selectedVariantId.value || !canConfirmAddPart.value) return

	let part: SentencePart
	switch (addPartType.value) {
		case 'text':
			part = { type: 'text', value: addPartText.value.trim() }
			break
		case 'genderVariant':
			part = {
				type: 'genderVariant',
				value: [addPartMale.value.trim(), addPartFemale.value.trim()],
			}
			break
		case 'name':
			part = { type: 'name' }
			break
		case 'optionalText':
			part = {
				type: 'optionalText',
				id: crypto.randomUUID(),
				value: addPartOptionalText.value.trim(),
				enabledByDefault: addPartOptionalEnabledByDefault.value,
			}
			break
		default:
			return
	}

	addPartModalOpen.value = false
	addSentencePart(
		selectedCategory.value.subjectId,
		selectedCategory.value.categoryId,
		selectedGradeId.value,
		selectedVariantId.value,
		part,
	)
}

const editLabelModalOpen = ref(false)
const editLabelTitle = ref('Umbenennen')
const editLabelValue = ref('')
const editLabelSupportsGradeValue = ref(false)
const editLabelGradeValueEnabled = ref(false)
const editLabelGradeValueInput = ref('')
const editLabelCallback = ref<((newLabel: string, gradeValue?: number | null) => void) | null>(null)

type EditLabelOptions = {
	title?: string
	supportsGradeValue?: boolean
	gradeValue?: number
}

function openEditLabelModal(
	currentLabel: string,
	onSave: (newLabel: string, gradeValue?: number | null) => void,
	options: EditLabelOptions = {}
) {
	editLabelTitle.value = options.title ?? 'Umbenennen'
	editLabelValue.value = currentLabel
	editLabelSupportsGradeValue.value = options.supportsGradeValue === true
	editLabelGradeValueEnabled.value = typeof options.gradeValue === 'number'
	editLabelGradeValueInput.value = typeof options.gradeValue === 'number'
		? String(options.gradeValue)
		: ''
	editLabelCallback.value = onSave
	editLabelModalOpen.value = true
}

function getEditLabelGradeValue(): number | null {
	const parsed = Number(editLabelGradeValueInput.value)
	return Number.isFinite(parsed) ? parsed : null
}

const canConfirmEditLabel = computed(() => {
	if (!editLabelValue.value.trim()) return false
	if (!editLabelSupportsGradeValue.value || !editLabelGradeValueEnabled.value) return true
	return getEditLabelGradeValue() !== null
})

function confirmEditLabel() {
	const label = editLabelValue.value.trim()
	if (!canConfirmEditLabel.value || !editLabelCallback.value) return
	const gradeValue = editLabelSupportsGradeValue.value
		? (editLabelGradeValueEnabled.value ? getEditLabelGradeValue() : null)
		: undefined
	editLabelCallback.value(label, gradeValue)
	editLabelModalOpen.value = false
	editLabelCallback.value = null
}

const editPartModalOpen = ref(false)
const editPartType = ref<'text' | 'genderVariant' | 'optionalText'>('text')
const editPartText = ref('')
const editPartMale = ref('')
const editPartFemale = ref('')
const editPartOptionalId = ref('')
const editPartOptionalText = ref('')
const editPartOptionalEnabledByDefault = ref(true)
const editPartSaveCallback = ref<((part: SentencePart) => void) | null>(null)

function openEditPartModal(part: SentencePart, onSave: (part: SentencePart) => void) {
	editPartSaveCallback.value = onSave
	if (part.type === 'text') {
		editPartType.value = 'text'
		editPartText.value = part.value
	} else if (part.type === 'genderVariant') {
		editPartType.value = 'genderVariant'
		editPartMale.value = part.value[0] ?? ''
		editPartFemale.value = part.value[1] ?? ''
	} else if (part.type === 'optionalText') {
		editPartType.value = 'optionalText'
		editPartOptionalId.value = part.id
		editPartOptionalText.value = part.value
		editPartOptionalEnabledByDefault.value = part.enabledByDefault
	} else {
		return
	}
	editPartModalOpen.value = true
}

function confirmEditPart() {
	if (!editPartSaveCallback.value) return
	let part: SentencePart
	if (editPartType.value === 'text') {
		part = { type: 'text', value: editPartText.value }
	} else if (editPartType.value === 'genderVariant') {
		part = { type: 'genderVariant', value: [editPartMale.value, editPartFemale.value] }
	} else {
		part = {
			type: 'optionalText',
			id: editPartOptionalId.value,
			value: editPartOptionalText.value,
			enabledByDefault: editPartOptionalEnabledByDefault.value,
		}
	}

	editPartSaveCallback.value(part)
	editPartModalOpen.value = false
	editPartSaveCallback.value = null
}

const mobileEditorOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 1023px)')
watch([selectedCategory, isMobile], ([category, mobile]) => {
	mobileEditorOpen.value = mobile && !!category
})

const hasSubjects = computed(() => props.templateSet.subjects.length > 0)

function createFirstSubjectAndCategory() {
	const subjectId = addSubject()
	const categoryId = addCategory(subjectId)
	nextTick(() => {
		selectCategory({ subjectId, categoryId })
	})
}

function createFirstCategory() {
	const subjectId = props.templateSet.subjects[0]?.id
	if (!subjectId) return
	const categoryId = addCategory(subjectId)
	nextTick(() => {
		selectCategory({ subjectId, categoryId })
	})
}
</script>

<template>
	<TemplateTreePanel
		v-model:selected-category="selectedCategory"
		:set-id="setId"
		:template-set="templateSet"
		:can-edit="canEditTemplates"
		:add-subject="addSubject"
		:delete-subject="deleteSubject"
		:reorder-subject="reorderSubject"
		:add-category="addCategory"
		:delete-category="deleteCategory"
		:reorder-category="reorderCategory"
		:update-subject-label="updateSubjectLabel"
		:update-category-label="updateCategoryLabel"
		:remove-set="removeSet"
	/>

	<USlideover
		v-if="isMobile && selectedCategory && selectedCategoryData"
		v-model:open="mobileEditorOpen"
		:title="gradeVariantTitle(selectedCategoryData)"
	>
		<template #body>
			<div class="p-4">
				<GradeVariantEditor
					:category="selectedCategoryData"
					:selected-grade-id="selectedGradeId"
					:selected-variant-id="selectedVariantId"
					:can-edit="canEditTemplates"
					@select-grade="selectedGradeId = $event"
					@select-variant="selectedVariantId = $event"
					@add-grade="addGradeAndSelect"
					@add-variant="addVariantAndSelect"
					@edit-grade-label="handleEditGradeLabel"
					@delete-grade="handleDeleteGrade"
					@edit-variant-label="handleEditVariantLabel"
					@delete-variant="handleDeleteVariant"
					@add-sentence-part="openAddPartModal"
					@edit-sentence-part="handleEditSentencePart"
					@delete-sentence-part="handleDeleteSentencePart"
					@reorder-sentence-parts="handleReorderSentenceParts"
				/>
			</div>
		</template>
	</USlideover>

	<UDashboardPanel v-if="selectedCategory && selectedCategoryData" id="templates-detail" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar :title="gradeVariantTitle(selectedCategoryData)" />
		</template>
		<template #body>
			<div class="flex h-full flex-col gap-3">
				<p class="shrink-0 text-sm text-muted">
					Bearbeite rechts die ausgewählte Kategorie aus der Vorlagenstruktur.
				</p>
				<GradeVariantEditor
					:category="selectedCategoryData"
					:selected-grade-id="selectedGradeId"
					:selected-variant-id="selectedVariantId"
					:can-edit="canEditTemplates"
					@select-grade="selectedGradeId = $event"
					@select-variant="selectedVariantId = $event"
					@add-grade="addGradeAndSelect"
					@add-variant="addVariantAndSelect"
					@edit-grade-label="handleEditGradeLabel"
					@delete-grade="handleDeleteGrade"
					@edit-variant-label="handleEditVariantLabel"
					@delete-variant="handleDeleteVariant"
					@add-sentence-part="openAddPartModal"
					@edit-sentence-part="handleEditSentencePart"
					@delete-sentence-part="handleDeleteSentencePart"
					@reorder-sentence-parts="handleReorderSentenceParts"
				/>
			</div>
		</template>
	</UDashboardPanel>

	<UDashboardPanel v-else id="templates-detail-empty" class="hidden lg:flex">
		<template #header>
			<UDashboardNavbar title="Editor" />
		</template>
		<template #body>
			<div class="flex h-full items-center justify-center p-6">
				<div class="max-w-md text-center">
					<p class="text-sm text-muted">
						{{
							hasSubjects
								? 'Lege als Nächstes eine Kategorie an, damit du hier Notenstufen, Varianten und Satzbausteine bearbeiten kannst.'
								: 'Dieser Vorlagensatz ist noch leer. Starte mit einem ersten Fach und einer Kategorie, damit du sofort Inhalte pflegen kannst.'
						}}
					</p>
					<p class="mt-3 text-xs text-muted">
						Struktur: Fach -> Kategorie -> Stufe -> Variante -> Satzbausteine.
					</p>
					<div v-if="canEditTemplates" class="mt-4 flex justify-center">
						<UButton
							v-if="hasSubjects"
							label="Erste Kategorie anlegen"
							icon="i-lucide-folder-plus"
							@click="createFirstCategory"
						/>
						<UButton
							v-else
							label="Mit erstem Fach starten"
							icon="i-lucide-plus"
							@click="createFirstSubjectAndCategory"
						/>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>

	<UModal
		v-model:open="addPartModalOpen"
		title="Satzbaustein hinzufügen"
		description="Wähle den Typ und gib den Inhalt ein."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<UFormField label="Typ" name="add-part-type">
				<UTabs
					:items="addPartTabItems"
					:model-value="addPartType"
					:content="false"
					class="w-full"
					@update:model-value="(value) => (addPartType = value as typeof addPartType)"
				/>
			</UFormField>
			<p class="mt-2 text-sm text-muted">{{ addPartHelp }}</p>
			<template v-if="addPartType === 'text'">
				<UFormField label="Text" name="add-part-text" class="mt-3">
					<UInput v-model="addPartText" placeholder="Text eingeben" autofocus @keydown.enter="confirmAddPart" />
				</UFormField>
			</template>
			<template v-else-if="addPartType === 'genderVariant'">
				<div class="mt-3 flex items-start gap-2">
					<div class="flex-1">
						<UFormField label="Männliche Form" name="add-part-male">
							<UInput v-model="addPartMale" placeholder="z. B. Er" autofocus />
						</UFormField>
						<UFormField label="Weibliche Form" name="add-part-female">
							<UInput v-model="addPartFemale" placeholder="z. B. Sie" @keydown.enter="confirmAddPart" />
						</UFormField>
					</div>
					<div class="flex shrink-0 flex-col gap-1 pt-6">
						<UButton
							v-for="preset in genderVariantPresets"
							:key="preset.label"
							:label="preset.label"
							color="neutral"
							variant="outline"
							size="xs"
							@click="applyGenderVariantPreset(preset)"
						/>
					</div>
				</div>
			</template>
			<template v-else-if="addPartType === 'name'">
				<p class="mt-3 text-sm text-muted">Keine weitere Eingabe nötig.</p>
			</template>
			<template v-else-if="addPartType === 'optionalText'">
				<UFormField label="Optionaler Text" name="add-part-optional-text" class="mt-3">
					<UInput
						v-model="addPartOptionalText"
						placeholder="Text eingeben"
						autofocus
						@keydown.enter="confirmAddPart"
					/>
				</UFormField>
				<UCheckbox
					:model-value="addPartOptionalEnabledByDefault"
					label="Standardmäßig aktiv"
					class="mt-3"
					@update:model-value="addPartOptionalEnabledByDefault = Boolean($event)"
				/>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Hinzufügen" :disabled="!canConfirmAddPart" @click="confirmAddPart" />
		</template>
	</UModal>

	<UModal v-model:open="editPartModalOpen" title="Satzbaustein bearbeiten" :ui="{ footer: 'justify-end' }">
		<template #body>
			<template v-if="editPartType === 'text'">
				<UFormField label="Text" name="edit-part-text">
					<UInput v-model="editPartText" placeholder="Text eingeben" autofocus @keydown.enter="confirmEditPart" />
				</UFormField>
			</template>
			<template v-else-if="editPartType === 'genderVariant'">
				<UFormField label="Männliche Form" name="edit-part-male">
					<UInput v-model="editPartMale" placeholder="z. B. Er" autofocus />
				</UFormField>
				<UFormField label="Weibliche Form" name="edit-part-female">
					<UInput v-model="editPartFemale" placeholder="z. B. Sie" @keydown.enter="confirmEditPart" />
				</UFormField>
			</template>
			<template v-else-if="editPartType === 'optionalText'">
				<UFormField label="Optionaler Text" name="edit-part-optional-text">
					<UInput
						v-model="editPartOptionalText"
						placeholder="Text eingeben"
						autofocus
						@keydown.enter="confirmEditPart"
					/>
				</UFormField>
				<UCheckbox
					:model-value="editPartOptionalEnabledByDefault"
					label="Standardmäßig aktiv"
					class="mt-3"
					@update:model-value="editPartOptionalEnabledByDefault = Boolean($event)"
				/>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Speichern" @click="confirmEditPart" />
		</template>
	</UModal>

	<UModal v-model:open="editLabelModalOpen" :title="editLabelTitle" :ui="{ footer: 'justify-end' }">
		<template #body>
			<UFormField label="Name" name="edit-label">
				<UInput v-model="editLabelValue" autofocus @keydown.enter="confirmEditLabel" />
			</UFormField>
			<template v-if="editLabelSupportsGradeValue">
				<UCheckbox
					:model-value="editLabelGradeValueEnabled"
					label="Eigenen Wert für Durchschnitt verwenden"
					class="mt-4"
					@update:model-value="editLabelGradeValueEnabled = Boolean($event)"
				/>
				<UFormField
					v-if="editLabelGradeValueEnabled"
					label="Wert für Durchschnitt"
					name="edit-grade-value"
					description="Wenn deaktiviert, wird die Notenstufen-Bezeichnung als Zahl verwendet."
					class="mt-3"
				>
					<UInput
						v-model="editLabelGradeValueInput"
						type="number"
						step="0.1"
						placeholder="z. B. 2.5"
						@keydown.enter="confirmEditLabel"
					/>
				</UFormField>
			</template>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Speichern" :disabled="!canConfirmEditLabel" @click="confirmEditLabel" />
		</template>
	</UModal>

	<UModal
		v-model:open="deleteDialog.open.value"
		:title="deleteDialog.title.value"
		:description="deleteDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="deleteDialog.cancel()" />
			<UButton label="Löschen" color="error" @click="deleteDialog.confirm()" />
		</template>
	</UModal>
</template>
