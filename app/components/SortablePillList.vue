<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { SentencePart } from '~/types/template'

const props = withDefaults(
	defineProps<{
		parts: SentencePart[]
		canEdit?: boolean
	}>(),
	{ canEdit: false },
)

const emit = defineEmits<{
	reorder: [oldIndex: number, newIndex: number]
	add: []
}>()

const listRef = ref<HTMLElement | null>(null)
const localList = ref<SentencePart[]>([])
const partKeyMap = new WeakMap<SentencePart, string>()
let partKeyCounter = 0

function partKey(part: SentencePart): string {
	const existing = partKeyMap.get(part)
	if (existing) return existing
	partKeyCounter += 1
	const key = `sentence-part-${partKeyCounter}`
	partKeyMap.set(part, key)
	return key
}

watch(
	() => props.parts,
	(newVal) => {
		localList.value = [...newVal]
	},
	{ immediate: true },
)

useSortable(listRef, localList, {
	handle: '.sentence-pill-drag-handle',
	animation: 150,
	onEnd: (evt: {
		oldIndex: number | undefined
		newIndex: number | undefined
	}) => {
		const oldIndex = evt.oldIndex
		const newIndex = evt.newIndex
		if (
			oldIndex === undefined ||
			newIndex === undefined ||
			oldIndex === newIndex
		)
			return
		emit('reorder', oldIndex, newIndex)
	},
})
</script>

<template>
	<div class="flex flex-wrap items-center gap-2">
		<div ref="listRef" class="flex flex-wrap items-center gap-2">
			<template v-for="(part, partIndex) in localList" :key="partKey(part)">
				<TemplatePill
					:label="''"
					:show-drag-handle="canEdit"
					:can-edit="canEdit"
					:selectable="false"
				>
					<slot name="label" :part="part" :part-index="partIndex">
						{{
							part.type === 'text'
								? part.value || '(leer)'
								: part.type === 'genderVariant'
									? `${part.value[0] ?? ''}/${part.value[1] ?? ''}`
									: 'Name'
						}}
					</slot>
					<template v-if="canEdit" #actions>
						<slot
							name="actions"
							:part="part"
							:part-index="partIndex"
						/>
					</template>
				</TemplatePill>
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
	</div>
</template>
