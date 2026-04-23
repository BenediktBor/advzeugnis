<script setup lang="ts">
const props = withDefaults(defineProps<{
	canEdit: boolean
	disabled?: boolean
	compact?: boolean
}>(), {
	disabled: false,
	compact: false,
})

const {
	importDialog,
	importFileInput,
	onDownloadAdvzeu,
	onClickImportAdvzeu,
	onImportAdvzeuFileChange,
} = useAdvZeUTemplatesImportExport()
</script>

<template>
	<template v-if="canEdit">
		<div v-if="compact" class="flex items-center gap-1">
			<UTooltip text="Vorlagen importieren">
				<UButton
					icon="i-lucide-upload"
					color="neutral"
					variant="ghost"
					size="xs"
					aria-label="Vorlagen importieren"
					@click.stop.prevent="onClickImportAdvzeu"
				/>
			</UTooltip>
			<UTooltip text="Vorlagen exportieren">
				<UButton
					icon="i-lucide-download"
					color="neutral"
					variant="ghost"
					size="xs"
					:disabled="disabled"
					aria-label="Vorlagen exportieren"
					@click.stop.prevent="onDownloadAdvzeu"
				/>
			</UTooltip>
		</div>

		<div v-else class="flex items-center gap-2">
			<UButton
				label="Vorlagen importieren"
				icon="i-lucide-upload"
				color="neutral"
				variant="ghost"
				@click="onClickImportAdvzeu"
			/>
			<UButton
				label="Vorlagen exportieren"
				icon="i-lucide-download"
				color="neutral"
				variant="ghost"
				:disabled="disabled"
				@click="onDownloadAdvzeu"
			/>
		</div>
	</template>

	<input
		ref="importFileInput"
		type="file"
		class="hidden"
		accept=".advzeu,application/json"
		@change="onImportAdvzeuFileChange"
	/>

	<UModal
		v-model:open="importDialog.open.value"
		:title="importDialog.title.value"
		:description="importDialog.description.value"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton label="Abbrechen" color="neutral" variant="outline" @click="importDialog.cancel()" />
			<UButton
				label="Importieren"
				icon="i-lucide-upload"
				color="neutral"
				@click="importDialog.confirm()"
			/>
		</template>
	</UModal>
</template>
