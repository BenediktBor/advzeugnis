<script setup lang="ts">
const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const { setsWithData, orderedIds } = useTemplateSets()
const { createStudentAndOpen } = useCreateStudentFlow()

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

const genderItems = [
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]

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
	templateSetId.value = orderedIds.value[0] ?? ''
}

function confirmCreateStudent() {
	if (!canSubmit.value) return
	createStudentAndOpen({
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
		templateSetId.value = orderedIds.value[0] ?? ''
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
			<div class="flex flex-col gap-4">
				<div class="rounded-lg border border-default bg-elevated/40 p-3">
					<div class="flex items-start gap-3">
						<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							<UIcon name="i-lucide-user-plus" class="size-5" />
						</div>
						<div class="min-w-0">
							<p class="text-sm font-medium text-default">Neuer Schülerdatensatz</p>
							<p class="mt-1 text-sm text-muted">
								Der Datensatz wird erst angelegt, wenn ein Vorname und eine Vorlage gewählt sind.
							</p>
						</div>
					</div>
				</div>

				<section class="space-y-3">
					<div>
						<h3 class="text-sm font-medium text-default">Stammdaten</h3>
						<p class="text-xs text-muted">Diese Angaben erscheinen später in der Schülerliste.</p>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<UFormField label="Vorname" name="create-student-name" required>
							<UInput
								v-model="name"
								placeholder="z. B. Mia"
								autofocus
								@keydown.enter.prevent="confirmCreateStudent"
							/>
						</UFormField>
						<UFormField label="Nachname" name="create-student-surname">
							<UInput
								v-model="surname"
								placeholder="z. B. Müller"
								@keydown.enter.prevent="confirmCreateStudent"
							/>
						</UFormField>
					</div>
				</section>

				<section class="space-y-3">
					<div>
						<h3 class="text-sm font-medium text-default">Zeugnisgrundlage</h3>
						<p class="text-xs text-muted">
							Geschlecht und Vorlagensatz steuern die späteren Satzvorschläge.
						</p>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<UFormField label="Geschlecht" name="create-student-gender">
							<div class="grid grid-cols-2 gap-2">
								<UButton
									v-for="item in genderItems"
									:key="item.value"
									:label="item.label"
									:variant="gender === item.value ? 'solid' : 'outline'"
									:color="gender === item.value ? 'primary' : 'neutral'"
									block
									@click="gender = item.value"
								/>
							</div>
						</UFormField>
						<UFormField label="Vorlagensatz" name="create-student-template" required>
							<USelectMenu
								v-model="templateSetId"
								:items="templateSetItems"
								value-key="value"
								placeholder="Vorlage wählen"
								class="w-full"
							/>
						</UFormField>
					</div>
				</section>
			</div>
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
