<script setup lang="ts">
import Sortable from 'sortablejs'
import type { OptionalGroupChildPart, SentencePart, SentencePartPath } from '~/types/template'

type PillContextMenuAction = 'copy' | 'cut' | 'paste'
type SentencePartSortableEvent = {
	oldIndex?: number
	newIndex?: number
	from: HTMLElement
	to: HTMLElement
	item: HTMLElement
}
type SentencePartSortableOptions = ConstructorParameters<typeof Sortable>[1] & {
	group?: {
		name: string
		pull: boolean
		put: (to: Sortable, from: Sortable, dragged: HTMLElement) => boolean
	}
	onEnd?: (event: SentencePartSortableEvent) => void
}

const props = withDefaults(
	defineProps<{
		parts: SentencePart[]
		canEdit?: boolean
		selectedIds?: string[]
		canPaste?: boolean
	}>(),
	{ canEdit: false, selectedIds: () => [], canPaste: false },
)

const emit = defineEmits<{
	reorder: [oldIndex: number, newIndex: number]
	reorderGroup: [groupIndex: number, oldIndex: number, newIndex: number]
	moveToGroup: [fromIndex: number, groupIndex: number, childIndex?: number]
	moveFromGroup: [groupIndex: number, childIndex: number, toIndex?: number]
	moveBetweenGroups: [fromGroupIndex: number, childIndex: number, toGroupIndex: number, toChildIndex?: number]
	add: []
	addToGroup: [groupIndex: number]
	pasteFromClipboard: []
	toggleGroupDefault: [partIndex: number, enabledByDefault: boolean]
	select: [path: SentencePartPath, event: MouseEvent | KeyboardEvent]
	contextOpen: [path: SentencePartPath]
	contextAction: [action: PillContextMenuAction, path: SentencePartPath]
	edit: [path: SentencePartPath]
	delete: [path: SentencePartPath]
}>()

const rootRef = ref<HTMLElement | null>(null)
const rootListRef = ref<HTMLElement | null>(null)
const sortables: Sortable[] = []
const partKeyMap = new WeakMap<SentencePart | OptionalGroupChildPart, string>()
let partKeyCounter = 0

function partKey(part: SentencePart | OptionalGroupChildPart): string {
	const existing = partKeyMap.get(part)
	if (existing) return existing
	partKeyCounter += 1
	const key = `sentence-part-${partKeyCounter}`
	partKeyMap.set(part, key)
	return key
}

function defaultPartLabel(part: SentencePart | OptionalGroupChildPart): string {
	if (part.type === 'text') return part.value || '(leer)'
	if (part.type === 'genderVariant') return `${part.value[0] ?? ''}/${part.value[1] ?? ''}`
	if (part.type === 'optionalGroup') {
		return `Optionale Gruppe (${part.enabledByDefault ? 'aktiv' : 'inaktiv'})`
	}
	if (part.type === 'input') {
		return part.placeholder?.trim() ? `Eingabe (${part.placeholder.trim()})` : 'Eingabe'
	}
	return 'Name'
}

function destroySortables() {
	while (sortables.length) sortables.pop()?.destroy()
}

function sortableIndex(value: number | undefined): number | null {
	return value === undefined || value < 0 ? null : value
}

function listType(element: HTMLElement | null | undefined): 'root' | 'group' | null {
	const type = element?.dataset.sentencePartList
	return type === 'root' || type === 'group' ? type : null
}

function groupIndex(element: HTMLElement | null | undefined): number | null {
	const raw = element?.dataset.groupIndex
	const index = raw === undefined ? Number.NaN : Number(raw)
	return Number.isInteger(index) && index >= 0 ? index : null
}

function canReceiveDraggedPart(_to: Sortable, _from: Sortable, dragged: HTMLElement) {
	return dragged.dataset.partType !== 'optionalGroup'
}

function restoreDraggedDomPosition(evt: SentencePartSortableEvent) {
	const oldIndex = evt.oldIndex
	if (oldIndex === undefined) return
	if (evt.item.parentElement === evt.from) {
		evt.from.removeChild(evt.item)
	}
	const referenceNode = evt.from.children.item(oldIndex) ?? null
	evt.from.insertBefore(evt.item, referenceNode)
}

function startSortables() {
	destroySortables()
	if (!props.canEdit) return
	const rootList = rootListRef.value
	if (!rootList) return

	sortables.push(new Sortable(rootList, {
		group: {
			name: 'sentence-parts',
			pull: true,
			put: canReceiveDraggedPart,
		},
		draggable: '[data-sentence-part-root="true"]',
		handle: '.sentence-part-root-drag-handle',
		animation: 150,
		onEnd: (evt: SentencePartSortableEvent) => {
			const oldIndex = sortableIndex(evt.oldIndex)
			const newIndex = sortableIndex(evt.newIndex)
			const fromType = listType(evt.from)
			const toType = listType(evt.to)
			restoreDraggedDomPosition(evt)
			if (oldIndex === null) return
			if (fromType === 'root' && toType === 'root') {
				if (newIndex !== null && oldIndex !== newIndex) emit('reorder', oldIndex, newIndex)
				return
			}
			if (fromType === 'root' && toType === 'group') {
				const targetGroupIndex = groupIndex(evt.to)
				if (targetGroupIndex !== null) emit('moveToGroup', oldIndex, targetGroupIndex, newIndex ?? undefined)
				return
			}
		},
	} as SentencePartSortableOptions))

	for (const groupList of rootRef.value?.querySelectorAll<HTMLElement>('[data-sentence-part-list="group"]') ?? []) {
		sortables.push(new Sortable(groupList, {
			group: {
				name: 'sentence-parts',
				pull: true,
				put: canReceiveDraggedPart,
			},
			draggable: '[data-sentence-part-child="true"]',
			handle: '.sentence-part-child-drag-handle',
			animation: 150,
			onEnd: (evt: SentencePartSortableEvent) => {
				const oldIndex = sortableIndex(evt.oldIndex)
				const newIndex = sortableIndex(evt.newIndex)
				const sourceGroupIndex = groupIndex(evt.from)
				const targetGroupIndex = groupIndex(evt.to)
				const fromType = listType(evt.from)
				const toType = listType(evt.to)
				restoreDraggedDomPosition(evt)
				if (oldIndex === null) return
				if (fromType === 'group' && toType === 'group' && sourceGroupIndex !== null && targetGroupIndex !== null) {
					if (sourceGroupIndex === targetGroupIndex) {
						if (newIndex !== null && oldIndex !== newIndex) emit('reorderGroup', sourceGroupIndex, oldIndex, newIndex)
						return
					}
					emit('moveBetweenGroups', sourceGroupIndex, oldIndex, targetGroupIndex, newIndex ?? undefined)
					return
				}
				if (fromType === 'group' && toType === 'root' && sourceGroupIndex !== null) {
					emit('moveFromGroup', sourceGroupIndex, oldIndex, newIndex ?? undefined)
				}
			},
		} as SentencePartSortableOptions))
	}
}

watch(
	[() => props.parts, () => props.canEdit],
	() => {
		void nextTick(startSortables)
	},
	{ immediate: true, deep: true, flush: 'post' },
)

onBeforeUnmount(destroySortables)

function contextMenuItems(path: SentencePartPath) {
	return [
		[
			{
				label: 'Kopieren',
				icon: 'i-lucide-copy',
				onSelect: () => emit('contextAction', 'copy', path),
			},
			{
				label: 'Ausschneiden',
				icon: 'i-lucide-scissors',
				disabled: !props.canEdit,
				onSelect: () => emit('contextAction', 'cut', path),
			},
			{
				label: 'Einfügen',
				icon: 'i-lucide-clipboard-paste',
				disabled: !props.canEdit || !props.canPaste,
				onSelect: () => emit('contextAction', 'paste', path),
			},
		],
	]
}

function partPathId(path: SentencePartPath): string {
	return path.childIndex === undefined ? String(path.partIndex) : `${path.partIndex}.${path.childIndex}`
}

function canEditPart(part: SentencePart | OptionalGroupChildPart): boolean {
	return part.type === 'text' || part.type === 'genderVariant' || part.type === 'input'
}

const partsSignature = computed(() =>
	props.parts.map((part, partIndex) => {
		if (part.type !== 'optionalGroup') return `${partIndex}:${partKey(part)}`
		return `${partIndex}:${partKey(part)}[${part.parts.map(partKey).join(',')}]`
	}).join('|')
)
</script>

<template>
	<div ref="rootRef" class="flex flex-wrap items-start gap-2">
		<div
			ref="rootListRef"
			:key="partsSignature"
			class="flex flex-wrap items-start gap-2"
			data-sentence-part-list="root"
		>
			<template v-for="(part, partIndex) in parts" :key="partKey(part)">
				<div
					v-if="part.type === 'optionalGroup'"
					:class="[
						'inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-1 text-sm transition-colors',
						selectedIds.includes(partPathId({ partIndex }))
							? 'border-primary bg-primary/10 ring-1 ring-primary/40'
							: 'border-default bg-elevated/40',
					]"
					data-sentence-part-root="true"
					:data-part-type="part.type"
					@click="emit('select', { partIndex }, $event)"
					@contextmenu="emit('contextOpen', { partIndex })"
				>
					<UContextMenu :items="contextMenuItems({ partIndex })">
						<div class="inline-flex items-center gap-1">
							<span
								v-if="canEdit"
								class="sentence-part-root-drag-handle cursor-grab active:cursor-grabbing text-muted hover:text-default shrink-0 flex items-center"
								aria-label="Optionale Gruppe verschieben"
								@click.stop
							>
								<UIcon class="size-3.5" name="i-lucide-grip-vertical" />
							</span>
							<label
								class="inline-flex items-center gap-1 rounded-full px-1 text-xs text-muted"
								title="Standardmäßig aktiv"
								@click.stop
								@keydown.enter.stop
								@keydown.space.stop
							>
								<UCheckbox
									:model-value="part.enabledByDefault"
									:disabled="!canEdit"
									size="xs"
									aria-label="Optionale Gruppe standardmäßig aktiv"
									@update:model-value="emit('toggleGroupDefault', partIndex, Boolean($event))"
								/>
								<span :class="part.enabledByDefault ? 'text-default' : 'text-muted line-through'">
									Aktiv
								</span>
							</label>
						<div
							class="inline-flex min-h-7 min-w-9 flex-wrap items-center gap-1"
							data-sentence-part-list="group"
							:data-group-index="partIndex"
							@click.stop
							@contextmenu.stop
						>
							<template v-for="(childPart, childIndex) in part.parts" :key="partKey(childPart)">
								<div
									data-sentence-part-child="true"
									:data-part-type="childPart.type"
								>
									<UContextMenu :items="contextMenuItems({ partIndex, childIndex })">
										<TemplatePill
											:label="defaultPartLabel(childPart)"
											:show-drag-handle="canEdit"
											drag-handle-class="sentence-part-child-drag-handle"
											:can-edit="canEdit"
											:selected="selectedIds.includes(partPathId({ partIndex, childIndex }))"
											selectable
											@click="emit('select', { partIndex, childIndex }, $event)"
											@contextmenu="emit('contextOpen', { partIndex, childIndex })"
										>
											<slot
												name="label"
												:part="childPart"
												:part-index="partIndex"
												:child-index="childIndex"
											>
												{{ defaultPartLabel(childPart) }}
											</slot>
											<template v-if="canEdit" #actions>
												<UButton
													v-if="canEditPart(childPart)"
													icon="i-lucide-pencil"
													color="neutral"
													variant="ghost"
													size="xs"
													aria-label="Baustein bearbeiten"
													@click.stop="emit('edit', { partIndex, childIndex })"
												/>
												<UButton
													icon="i-lucide-trash-2"
													color="neutral"
													variant="ghost"
													size="xs"
													aria-label="Baustein löschen"
													@click.stop="emit('delete', { partIndex, childIndex })"
												/>
											</template>
										</TemplatePill>
									</UContextMenu>
								</div>
							</template>
							<UButton
								v-if="canEdit"
								icon="i-lucide-plus"
								class="rounded-full"
								variant="soft"
								size="xs"
								aria-label="Baustein in optionale Gruppe einfügen"
								@click="emit('addToGroup', partIndex)"
							/>
						</div>
							<UButton
								v-if="canEdit"
								icon="i-lucide-trash-2"
								color="neutral"
								variant="ghost"
								size="xs"
								aria-label="Optionale Gruppe löschen"
								@click.stop="emit('delete', { partIndex })"
							/>
						</div>
					</UContextMenu>
				</div>
				<div
					v-else
					data-sentence-part-root="true"
					:data-part-type="part.type"
				>
					<UContextMenu :items="contextMenuItems({ partIndex })">
						<TemplatePill
							:label="defaultPartLabel(part)"
							:show-drag-handle="canEdit"
							drag-handle-class="sentence-part-root-drag-handle"
							:can-edit="canEdit"
							:selected="selectedIds.includes(partPathId({ partIndex }))"
							selectable
							@click="emit('select', { partIndex }, $event)"
							@contextmenu="emit('contextOpen', { partIndex })"
						>
							<slot name="label" :part="part" :part-index="partIndex">
								{{ defaultPartLabel(part) }}
							</slot>
							<template v-if="canEdit" #actions>
								<slot
									name="actions"
									:part="part"
									:part-index="partIndex"
								>
									<UButton
										v-if="canEditPart(part)"
										icon="i-lucide-pencil"
										color="neutral"
										variant="ghost"
										size="xs"
										aria-label="Baustein bearbeiten"
										@click.stop="emit('edit', { partIndex })"
									/>
									<UButton
										icon="i-lucide-trash-2"
										color="neutral"
										variant="ghost"
										size="xs"
										aria-label="Baustein löschen"
										@click.stop="emit('delete', { partIndex })"
									/>
								</slot>
							</template>
						</TemplatePill>
					</UContextMenu>
				</div>
			</template>
		</div>
		<UButton
			v-if="canEdit"
			icon="i-lucide-plus"
			class="rounded-full"
			variant="soft"
			aria-label="Baustein hinzufügen"
			@click="emit('add')"
		/>
		<UButton
			v-if="canEdit"
			label="Aus Zwischenablage"
			icon="i-lucide-clipboard-paste"
			size="sm"
			variant="soft"
			:disabled="!canPaste"
			@click="emit('pasteFromClipboard')"
		/>
	</div>
</template>
