<script setup lang="ts">
import { api } from '~/utils/convexApi'
import { clearAuthTokens } from '~/utils/convexAuthClient'

const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const client = useConvexClient()

const deleteConfirmation = ref('')
const isDeleting = ref(false)
const deleteError = ref('')

const isOpen = computed({
	get: () => props.open,
	set: (value: boolean) => emit('update:open', value),
})

const canConfirmDelete = computed(() => deleteConfirmation.value === 'LOESCHEN')

watch(isOpen, (open) => {
	if (open) return
	deleteConfirmation.value = ''
	deleteError.value = ''
})

async function deleteAccount() {
	if (!canConfirmDelete.value) return
	deleteError.value = ''
	isDeleting.value = true
	try {
		await client.action(api.users.deleteCurrentAccount, {})
		clearAuthTokens()
		await navigateTo('/', { replace: true })
	} catch (err) {
		console.error('[user] account deletion failed:', err)
		deleteError.value =
			'Konto konnte nicht gelöscht werden. Falls du Schul-Admin bist, entferne oder übertrage zuerst andere Mitglieder.'
	} finally {
		isDeleting.value = false
	}
}
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Konto wirklich löschen?"
		:ui="{ footer: 'justify-end' }"
	>
		<template #body>
			<div class="flex flex-col gap-4">
				<p class="text-sm text-muted">
					Gib <strong>LOESCHEN</strong> ein, um dein Konto dauerhaft zu löschen.
				</p>
				<UAlert v-if="deleteError" color="error" variant="soft" :title="deleteError" />
				<UFormField label="Bestätigung">
					<UInput v-model="deleteConfirmation" autocomplete="off" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<UButton
				label="Abbrechen"
				color="neutral"
				variant="ghost"
				:disabled="isDeleting"
				@click="isOpen = false"
			/>
			<UButton
				label="Konto löschen"
				icon="i-lucide-trash-2"
				color="error"
				:disabled="!canConfirmDelete"
				:loading="isDeleting"
				@click="deleteAccount"
			/>
		</template>
	</UModal>
</template>
