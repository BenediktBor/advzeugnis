<script setup lang="ts">
function reloadPage() {
	if (!import.meta.client) return
	window.location.reload()
}
</script>

<template>
	<AppStateNotice
		title="Gespeicherte Daten konnten nicht geladen werden"
		description="Bitte lade die Seite neu. Falls der Fehler bleibt, exportiere keine neuen Daten, damit vorhandene lokale Daten nicht überschrieben werden."
		icon="i-lucide-triangle-alert"
		tone="error"
	>
		<UButton
			label="Seite neu laden"
			icon="i-lucide-refresh-cw"
			color="error"
			variant="outline"
			size="sm"
			@click="reloadPage"
		/>
	</AppStateNotice>
</template>
