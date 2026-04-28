<script setup lang="ts">
import Sortable from 'sortablejs'
import type { TemplateSet } from '~/types/template'

type FlatDescriptor =
	| { type: 'subject'; subjectId: string }
	| { type: 'category'; subjectId: string; categoryId: string }

type SortableLikeEvent = {
	oldIndex?: number
	newIndex?: number
	from?: HTMLElement
	item?: HTMLElement
}

type TemplateActionMenuItem =
	| {
			label: string
			icon: string
			color?: 'neutral' | 'error'
			onSelect: () => void
	  }
	| { type: 'separator' }

const props = defineProps<{
	setId: string
	templateSet: TemplateSet
	canEdit: boolean
	selectedCategory: { subjectId: string; categoryId: string } | null
	addSubject: (label?: string) => string
	deleteSubject: (subjectId: string) => void
	reorderSubject: (oldIndex: number, newIndex: number) => void
	addCategory: (subjectId: string, label?: string) => string
	deleteCategory: (subjectId: string, categoryId: string) => void
	reorderCategory: (
		fromSubjectId: string,
		oldIndex: number,
		newIndex: number,
		toSubjectId?: string,
	) => void
	updateSubjectLabel: (subjectId: string, label: string) => void
	updateCategoryLabel: (subjectId: string, categoryId: string, label: string) => void
	removeSet: (setId: string) => void
}>()

const emit = defineEmits<{
	'update:selectedCategory': [value: { subjectId: string; categoryId: string } | null]
}>()

const router = useRouter()
const deleteDialog = useConfirmDialog()
const { onDownloadAzsetForSet } = useAdvZeUTemplatesImportExport()
const {
	importFileInput: subjectImportFileInput,
	collisionModalOpen: subjectImportCollisionOpen,
	importedSubjectLabel,
	onDownloadSubject,
	onClickImportSubject,
	onImportSubjectFileChange,
	cancelSubjectImport,
	replaceImportedSubject,
	duplicateImportedSubject,
} = useTemplateSubjectImportExport(computed(() => props.setId))

const expandedKeys = ref<string[]>([])
watch(
	() => props.templateSet.subjects.map((subject) => `subject-${subject.id}`),
	(ids) => {
		expandedKeys.value = [...ids]
	},
	{ immediate: true }
)

function isSubjectExpanded(subjectId: string): boolean {
	return expandedKeys.value.includes(`subject-${subjectId}`)
}

function toggleSubjectExpanded(subjectId: string) {
	const key = `subject-${subjectId}`
	expandedKeys.value = isSubjectExpanded(subjectId)
		? expandedKeys.value.filter((value) => value !== key)
		: [...expandedKeys.value, key]
}

function selectCategory(category: { subjectId: string; categoryId: string } | null) {
	emit('update:selectedCategory', category)
}

function isSelectedCategory(subjectId: string, categoryId: string): boolean {
	return (
		props.selectedCategory?.subjectId === subjectId &&
		props.selectedCategory?.categoryId === categoryId
	)
}

function getSubject(subjectId: string) {
	return props.templateSet.subjects.find((subject) => subject.id === subjectId)
}

function getCategory(subjectId: string, categoryId: string) {
	return getSubject(subjectId)?.categories.find((category) => category.id === categoryId)
}

function flatten(
	subjects: { id: string; categories: { id: string }[] }[],
	expanded: string[],
): FlatDescriptor[] {
	const out: FlatDescriptor[] = []
	for (const subject of subjects) {
		out.push({ type: 'subject', subjectId: subject.id })
		if (expanded.includes(`subject-${subject.id}`)) {
			for (const category of subject.categories) {
				out.push({
					type: 'category',
					subjectId: subject.id,
					categoryId: category.id,
				})
			}
		}
	}
	return out
}

const flatDescriptors = ref<FlatDescriptor[]>([])
function resetFlatDescriptors() {
	flatDescriptors.value = flatten(props.templateSet.subjects, expandedKeys.value)
}

function flatDescriptorKey(descriptor: FlatDescriptor): string {
	return descriptor.type === 'subject'
		? `subject:${descriptor.subjectId}`
		: `category:${descriptor.subjectId}:${descriptor.categoryId}`
}

watch(
	[() => props.templateSet.subjects, expandedKeys] as const,
	() => {
		resetFlatDescriptors()
	},
	{ immediate: true }
)

const listRef = ref<HTMLElement | null>(null)

const preDragFlat = ref<FlatDescriptor[]>([])
const flatSignature = computed(() =>
	flatDescriptors.value.map(flatDescriptorKey).join('|')
)
let sortable: Sortable | null = null
let sortableInitId = 0

function destroySortable() {
	sortable?.destroy()
	sortable = null
}

function restoreDraggedDomPosition(evt: SortableLikeEvent) {
	const from = evt.from
	const item = evt.item
	const oldIndex = evt.oldIndex
	if (!from || !item || oldIndex === undefined) return
	if (item.parentElement === from) {
		from.removeChild(item)
	}
	const referenceNode = from.children.item(oldIndex) ?? null
	from.insertBefore(item, referenceNode)
}

function reorderSnapshot(snapshot: FlatDescriptor[], oldIndex: number, newIndex: number) {
	const next = [...snapshot]
	const [dragged] = next.splice(oldIndex, 1)
	if (!dragged) return { dragged: null, next }
	next.splice(newIndex, 0, dragged)
	return { dragged, next }
}

function resolveTargetSubjectId(
	postDrop: FlatDescriptor[],
	newIndex: number,
	fallbackSubjectId: string,
): string {
	for (let i = newIndex - 1; i >= 0; i--) {
		const descriptor = postDrop[i]
		if (descriptor) return descriptor.subjectId
	}
	for (let i = newIndex + 1; i < postDrop.length; i++) {
		const descriptor = postDrop[i]
		if (descriptor) return descriptor.subjectId
	}
	return fallbackSubjectId
}

function refreshFlatTree() {
	preDragFlat.value = []
	nextTick(() => {
		resetFlatDescriptors()
		void startSortable()
	})
}

function handleSortStart() {
	preDragFlat.value = [...flatDescriptors.value]
}

function handleSortEnd(evt: SortableLikeEvent) {
	restoreDraggedDomPosition(evt)

	const oldIndex = evt.oldIndex
	const newIndex = evt.newIndex
	const snapshot = preDragFlat.value
	preDragFlat.value = []

	if (
		oldIndex === undefined ||
		newIndex === undefined ||
		oldIndex === newIndex ||
		!snapshot.length
	) {
		refreshFlatTree()
		return
	}

	const source = snapshot[oldIndex]
	if (!source) {
		refreshFlatTree()
		return
	}

	const { next: postDrop } = reorderSnapshot(snapshot, oldIndex, newIndex)

	if (source.type === 'subject') {
		const oldSubjectIdx = props.templateSet.subjects.findIndex(
			(subject) => subject.id === source.subjectId,
		)
		const newSubjectIdx = postDrop
			.filter(
				(descriptor): descriptor is Extract<FlatDescriptor, { type: 'subject' }> =>
					descriptor.type === 'subject',
			)
			.findIndex((descriptor) => descriptor.subjectId === source.subjectId)

		if (oldSubjectIdx === -1 || newSubjectIdx === -1) {
			refreshFlatTree()
			return
		}

		props.reorderSubject(oldSubjectIdx, newSubjectIdx)
		refreshFlatTree()
		return
	}

	const fromSubjectId = source.subjectId
	const categoryId = source.categoryId
	const fromSubject = props.templateSet.subjects.find(
		(subject) => subject.id === fromSubjectId,
	)
	const oldCategoryIndex =
		fromSubject?.categories.findIndex((category) => category.id === categoryId) ?? -1

	if (!fromSubject || oldCategoryIndex === -1) {
		refreshFlatTree()
		return
	}

	const toSubjectId = resolveTargetSubjectId(postDrop, newIndex, fromSubjectId)
	const projectedCategories = postDrop
		.filter(
			(descriptor): descriptor is Extract<FlatDescriptor, { type: 'category' }> =>
				descriptor.type === 'category',
		)
		.map((descriptor) =>
			descriptor.categoryId === categoryId
				? { ...descriptor, subjectId: toSubjectId }
				: descriptor,
		)
	const toCategoryIndex = projectedCategories
		.filter((descriptor) => descriptor.subjectId === toSubjectId)
		.findIndex((descriptor) => descriptor.categoryId === categoryId)

	if (toCategoryIndex === -1) {
		refreshFlatTree()
		return
	}

	if (
		props.selectedCategory?.categoryId === categoryId &&
		fromSubjectId !== toSubjectId
	) {
		emit('update:selectedCategory', { subjectId: toSubjectId, categoryId })
	}

	props.reorderCategory(
		fromSubjectId,
		oldCategoryIndex,
		toCategoryIndex,
		toSubjectId,
	)
	refreshFlatTree()
}

async function startSortable() {
	const initId = ++sortableInitId
	destroySortable()
	if (!props.canEdit) return
	await nextTick()
	if (initId !== sortableInitId) return
	const target = listRef.value
	if (!target) return
	destroySortable()
	if (initId !== sortableInitId) return
	sortable = new Sortable(target, {
		draggable: '[data-dnd-row="true"]',
		handle: '.subject-drag-handle, .category-drag-handle',
		animation: 150,
		ghostClass: 'opacity-50',
		forceFallback: true,
		fallbackOnBody: true,
		onStart: handleSortStart,
		onEnd: handleSortEnd,
	})
}

watch(
	[listRef, flatSignature, () => props.canEdit],
	() => {
		void startSortable()
	},
	{ immediate: true, flush: 'post' }
)

onBeforeUnmount(() => {
	destroySortable()
})

const createSubjectModalOpen = ref(false)
const createSubjectName = ref('')

function openCreateSubjectModal() {
	createSubjectName.value = ''
	createSubjectModalOpen.value = true
}

function confirmCreateSubject() {
	const name = createSubjectName.value.trim()
	if (!name) return
	createSubjectModalOpen.value = false
	props.addSubject(name)
}

const createCategoryModalOpen = ref(false)
const createCategorySubjectId = ref('')
const createCategoryName = ref('')

function openCreateCategoryModal(subjectId: string) {
	createCategorySubjectId.value = subjectId
	createCategoryName.value = ''
	createCategoryModalOpen.value = true
}

function confirmCreateCategory() {
	const name = createCategoryName.value.trim()
	if (!name) return
	createCategoryModalOpen.value = false
	const subjectId = createCategorySubjectId.value
	const categoryId = props.addCategory(subjectId, name)
	emit('update:selectedCategory', { subjectId, categoryId })
}

const editLabelModalOpen = ref(false)
const editLabelValue = ref('')
const editLabelCallback = ref<((newLabel: string) => void) | null>(null)

function openEditLabelModal(currentLabel: string, onSave: (newLabel: string) => void) {
	editLabelValue.value = currentLabel
	editLabelCallback.value = onSave
	editLabelModalOpen.value = true
}

function confirmEditLabel() {
	const name = editLabelValue.value.trim()
	if (!name || !editLabelCallback.value) return
	editLabelCallback.value(name)
	editLabelModalOpen.value = false
	editLabelCallback.value = null
}

function confirmDeleteLabel(label: string): string {
	return `Möchtest du „${label || 'Unbenannt'}" wirklich löschen?`
}

function subjectActionItems(subjectId: string): TemplateActionMenuItem[] {
	return [
		{
			label: 'Fach exportieren',
			icon: 'i-lucide-download',
			color: 'neutral',
			onSelect: () => onDownloadSubject(subjectId),
		},
		{
			label: 'Fach umbenennen',
			icon: 'i-lucide-pencil',
			color: 'neutral',
			onSelect: () =>
				openEditLabelModal(
					getSubject(subjectId)?.label || '',
					(label) => props.updateSubjectLabel(subjectId, label),
				),
		},
		{ type: 'separator' },
		{
			label: 'Fach löschen',
			icon: 'i-lucide-trash-2',
			color: 'error',
			onSelect: () =>
				deleteDialog.show({
					title: 'Fach löschen?',
					description: confirmDeleteLabel(getSubject(subjectId)?.label || ''),
					onConfirm: () => props.deleteSubject(subjectId),
				}),
		},
	]
}

function categoryActionItems(subjectId: string, categoryId: string): TemplateActionMenuItem[] {
	return [
		{
			label: 'Umbenennen',
			icon: 'i-lucide-pencil',
			color: 'neutral',
			onSelect: () =>
				openEditLabelModal(
					getCategory(subjectId, categoryId)?.label || '',
					(label) => props.updateCategoryLabel(subjectId, categoryId, label),
				),
		},
		{ type: 'separator' },
		{
			label: 'Löschen',
			icon: 'i-lucide-trash-2',
			color: 'error',
			onSelect: () =>
				deleteDialog.show({
					title: 'Kategorie löschen?',
					description: confirmDeleteLabel(getCategory(subjectId, categoryId)?.label || ''),
					onConfirm: () => props.deleteCategory(subjectId, categoryId),
				}),
		},
	]
}
</script>

<template>
	<UDashboardPanel id="templates-list" resizable>
		<template #header>
			<UDashboardNavbar title="Vorlagen">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<div v-if="setId && canEdit" class="flex items-center gap-1">
						<UButton
							label="Exportieren"
							icon="i-lucide-download"
							color="neutral"
							variant="ghost"
							aria-label="Vorlagensatz exportieren"
							@click="onDownloadAzsetForSet(setId)"
						/>
						<UButton
							label="Löschen"
							icon="i-lucide-trash-2"
							color="error"
							variant="ghost"
							aria-label="Vorlage löschen"
							@click="
								deleteDialog.show({
									title: 'Vorlage löschen?',
									description: confirmDeleteLabel(templateSet.label),
									onConfirm: () => {
										removeSet(setId)
										router.push('/app/templates')
									},
								})
							"
						/>
					</div>
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-2">
				<div class="border-default pt-2">
					<div class="flex items-center justify-between gap-1 px-2">
						<span class="text-xs font-medium text-muted">Fächer</span>
						<div v-if="canEdit" class="flex items-center gap-1">
							<UButton
								icon="i-lucide-upload"
								color="neutral"
								variant="ghost"
								size="xs"
								aria-label="Fach importieren"
								@click="onClickImportSubject"
							/>
							<UButton
								icon="i-lucide-plus"
								color="neutral"
								variant="ghost"
								size="xs"
								aria-label="Fach hinzufügen"
								@click="openCreateSubjectModal"
							/>
						</div>
					</div>
					<ul ref="listRef" class="mt-1 flex flex-col gap-1" role="tree" aria-label="Fächer">
						<li
							v-for="descriptor in flatDescriptors"
							:key="flatDescriptorKey(descriptor)"
							data-dnd-row="true"
							class="list-none"
						>
							<div
								class="flex items-center gap-1 rounded-md px-2 py-1.5"
								:class="
									descriptor.type === 'category'
										? isSelectedCategory(descriptor.subjectId, descriptor.categoryId)
											? 'bg-primary/10 text-default pl-6'
											: 'hover:bg-elevated/70 pl-6'
										: 'hover:bg-elevated/70'
								"
							>
								<template v-if="descriptor.type === 'subject'">
									<button
										type="button"
										class="shrink-0 flex items-center text-muted"
										@click.stop="toggleSubjectExpanded(descriptor.subjectId)"
									>
										<UIcon
											class="size-4 transition-transform"
											:name="
												isSubjectExpanded(descriptor.subjectId)
													? 'i-lucide-chevron-down'
													: 'i-lucide-chevron-right'
											"
										/>
									</button>
									<span
										v-if="canEdit"
										class="subject-drag-handle cursor-grab active:cursor-grabbing shrink-0 text-muted hover:text-default flex items-center"
										aria-label="Reihenfolge ändern"
									>
										<UIcon class="size-4" name="i-lucide-grip-vertical" />
									</span>
									<button
										type="button"
										class="min-w-0 flex-1 truncate text-left text-sm font-medium text-default"
										@click="toggleSubjectExpanded(descriptor.subjectId)"
									>
										{{ getSubject(descriptor.subjectId)?.label || 'Unbenannt' }}
									</button>
									<div
										v-if="canEdit"
										class="ml-auto flex items-center gap-1"
									>
										<UButton
											label="Kategorie"
											icon="i-lucide-plus"
											color="neutral"
											variant="ghost"
											size="xs"
											aria-label="Kategorie hinzufügen"
											@click.stop="openCreateCategoryModal(descriptor.subjectId)"
										/>
										<UDropdownMenu
											:items="subjectActionItems(descriptor.subjectId)"
											:content="{ align: 'end' }"
											:ui="{ content: 'w-48' }"
											size="sm"
										>
											<UButton
												icon="i-lucide-more-horizontal"
												color="neutral"
												variant="ghost"
												size="xs"
												aria-label="Fachaktionen öffnen"
												@click.stop
											/>
										</UDropdownMenu>
									</div>
								</template>

								<template v-else>
									<span class="shrink-0 w-4" aria-hidden />
									<span
										v-if="canEdit"
										class="category-drag-handle cursor-grab active:cursor-grabbing shrink-0 text-muted hover:text-default flex items-center"
										aria-label="Reihenfolge ändern"
									>
										<UIcon class="size-4" name="i-lucide-grip-vertical" />
									</span>
									<button
										type="button"
										class="min-w-0 flex-1 truncate text-left text-sm"
										:class="
											isSelectedCategory(descriptor.subjectId, descriptor.categoryId)
												? 'font-medium text-default'
												: 'text-muted'
										"
										@click="
											selectCategory({
												subjectId: descriptor.subjectId,
												categoryId: descriptor.categoryId,
											})
										"
									>
										{{ getCategory(descriptor.subjectId, descriptor.categoryId)?.label || 'Unbenannt' }}
									</button>
									<div
										v-if="canEdit"
										class="ml-auto flex items-center gap-1"
									>
										<UDropdownMenu
											:items="categoryActionItems(descriptor.subjectId, descriptor.categoryId)"
											:content="{ align: 'end' }"
											:ui="{ content: 'w-48' }"
											size="sm"
										>
											<UButton
												icon="i-lucide-more-horizontal"
												color="neutral"
												variant="ghost"
												size="xs"
												aria-label="Kategorieaktionen öffnen"
												@click.stop
											/>
										</UDropdownMenu>
									</div>
								</template>
							</div>
						</li>
					</ul>
				</div>
			</div>
		</template>
	</UDashboardPanel>

	<input
		ref="subjectImportFileInput"
		type="file"
		class="hidden"
		accept=".azsubject,application/json"
		@change="onImportSubjectFileChange"
	/>

	<UModal
		v-model:open="createSubjectModalOpen"
		title="Fach hinzufügen"
		description="Gib einen Namen für das neue Fach ein."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<UFormField label="Fachname" name="create-subject-name">
				<UInput
					v-model="createSubjectName"
					placeholder="z. B. Mathe"
					autofocus
					@keydown.enter="confirmCreateSubject"
				/>
			</UFormField>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Hinzufügen" :disabled="!createSubjectName.trim()" @click="confirmCreateSubject" />
		</template>
	</UModal>

	<UModal
		v-model:open="createCategoryModalOpen"
		title="Kategorie hinzufügen"
		description="Gib einen Namen für die neue Kategorie ein."
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<UFormField label="Kategoriename" name="create-category-name">
				<UInput
					v-model="createCategoryName"
					placeholder="z. B. Raumorientierung"
					autofocus
					@keydown.enter="confirmCreateCategory"
				/>
			</UFormField>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Hinzufügen" :disabled="!createCategoryName.trim()" @click="confirmCreateCategory" />
		</template>
	</UModal>

	<UModal v-model:open="editLabelModalOpen" title="Umbenennen" :ui="{ footer: 'justify-end' }">
		<template #body>
			<UFormField label="Name" name="edit-label">
				<UInput v-model="editLabelValue" autofocus @keydown.enter="confirmEditLabel" />
			</UFormField>
		</template>
		<template #footer="{ close }">
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="close()" />
			<UButton label="Speichern" :disabled="!editLabelValue.trim()" @click="confirmEditLabel" />
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

	<UModal
		v-model:open="subjectImportCollisionOpen"
		title="Fach bereits vorhanden"
		:description="`Ein Fach mit derselben ID existiert bereits. Möchtest du „${importedSubjectLabel}“ ersetzen oder als neues Fach duplizieren?`"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="cancelSubjectImport()" />
			<UButton label="Duplizieren" color="neutral" variant="outline" @click="duplicateImportedSubject()" />
			<UButton label="Ersetzen" color="neutral" @click="replaceImportedSubject()" />
		</template>
	</UModal>
</template>
