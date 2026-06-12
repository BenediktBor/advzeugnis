<script setup lang="ts">
import {
	formatGermanEditorPresenceText,
	getEditorInitials,
	sortEditorsByDisplayName,
	TEMPLATE_EDITOR_CONFLICT_PREVENTION_TEXT,
	TEMPLATE_EDITOR_CONFLICT_RESOLUTION_TEXT,
	type TemplateActiveEditor,
} from '~/utils/templateEditorPresence'

const props = defineProps<{
	editors: TemplateActiveEditor[]
	hasConflict?: boolean
	isSyncPending?: boolean
}>()

const emit = defineEmits<{
	acceptRemote: []
	forceOverwrite: []
}>()

const overwriteDialog = useConfirmDialog()

const sortedEditors = computed(() => sortEditorsByDisplayName(props.editors))
const presenceText = computed(() => formatGermanEditorPresenceText(sortedEditors.value))
const showPresenceRow = computed(() => sortedEditors.value.length > 0)

function requestForceOverwrite() {
	overwriteDialog.show({
		title: 'Eigene Version überschreiben?',
		description: 'Änderungen anderer Benutzer gehen dabei verloren. Diese Aktion kann nicht rückgängig gemacht werden.',
		onConfirm: () => emit('forceOverwrite'),
	})
}
</script>

<template>
	<UAlert
		:color="hasConflict ? 'warning' : 'info'"
		variant="soft"
		:icon="hasConflict ? 'i-lucide-git-merge' : 'i-lucide-users'"
		:title="hasConflict ? 'Konflikt mit Serverversion' : 'Gemeinsame Bearbeitung'"
	>
		<template #description>
			<div class="flex flex-col gap-2">
				<div v-if="showPresenceRow" class="flex items-center gap-3">
					<UAvatarGroup :max="3" size="sm">
						<UAvatar
							v-for="editor in sortedEditors"
							:key="editor.displayName"
							:src="editor.image ?? undefined"
							:alt="editor.displayName"
							:text="getEditorInitials(editor.displayName)"
						/>
					</UAvatarGroup>
					<p class="text-sm text-muted">
						{{ presenceText }}
					</p>
				</div>
				<p v-if="hasConflict" class="text-sm text-muted">
					{{ TEMPLATE_EDITOR_CONFLICT_RESOLUTION_TEXT }}
				</p>
				<p v-else-if="showPresenceRow" class="text-sm text-muted">
					{{ TEMPLATE_EDITOR_CONFLICT_PREVENTION_TEXT }}
				</p>
			</div>
		</template>
		<template v-if="hasConflict" #actions>
			<UButton
				label="Serverversion laden"
				color="neutral"
				variant="outline"
				size="sm"
				@click="emit('acceptRemote')"
			/>
			<UButton
				label="Eigene Version überschreiben"
				color="warning"
				variant="solid"
				size="sm"
				:loading="isSyncPending"
				@click="requestForceOverwrite"
			/>
		</template>
	</UAlert>

	<UModal
		v-model:open="overwriteDialog.open.value"
		:title="overwriteDialog.title.value"
		:description="overwriteDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="overwriteDialog.cancel()" />
			<UButton
				label="Überschreiben"
				color="warning"
				:loading="isSyncPending"
				@click="overwriteDialog.confirm()"
			/>
		</template>
	</UModal>
</template>
