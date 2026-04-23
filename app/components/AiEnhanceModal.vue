<script setup lang="ts">
import type { EnhancePhase } from '~/composables/useAiRewriter'

defineProps<{
	open: boolean
	phase: EnhancePhase
	downloadProgress: number
	result: string
	error: string | null
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
	close: []
	copyResult: []
}>()
</script>

<template>
	<UModal
		:open="open"
		title="Mit KI verbessern"
		:ui="{ footer: 'justify-end' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="p-4 flex flex-col gap-4 min-w-0">
				<div v-if="phase === 'checking'" class="flex flex-col gap-3">
					<p class="text-default">Modell wird geprüft…</p>
				</div>
				<div v-else-if="phase === 'downloading'" class="flex flex-col gap-3">
					<p class="text-default">Modell wird vorbereitet…</p>
					<div class="w-full rounded-full bg-default h-2 overflow-hidden">
						<div
							class="h-full bg-primary transition-all duration-300"
							:style="{ width: `${Math.min(100, downloadProgress * 100)}%` }"
						/>
					</div>
				</div>
				<div v-else-if="phase === 'generating'" class="flex flex-col gap-3">
					<p class="text-default">Text wird verbessert…</p>
					<div class="flex items-center justify-center py-4 text-muted" aria-hidden="true">
						<span class="i-lucide-loader-2 size-6 animate-spin" aria-hidden="true" />
					</div>
				</div>
				<div v-else-if="phase === 'done'" class="flex flex-col gap-3">
					<div class="max-h-64 overflow-auto rounded-md border border-default bg-default px-3 py-2 text-sm text-default whitespace-pre-wrap">
						{{ result }}
					</div>
					<div class="flex justify-end gap-2">
						<UButton label="Kopieren" icon="i-lucide-copy" color="neutral" variant="outline" @click="emit('copyResult')" />
					</div>
				</div>
				<div v-else-if="phase === 'error'" class="flex flex-col gap-3">
					<p class="text-default">{{ error }}</p>
				</div>
			</div>
		</template>
		<template #footer>
			<UButton
				:label="phase === 'done' || phase === 'error' ? 'Schließen' : 'Abbrechen'"
				color="neutral"
				variant="outline"
				@click="emit('close')"
			/>
		</template>
	</UModal>
</template>
