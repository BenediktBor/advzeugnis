<script setup lang="ts">
import type { SentencePartEditorType } from '~/composables/useLocalSentencePartsEditor'

const partType = defineModel<SentencePartEditorType>('partType', { required: true })
const partText = defineModel<string>('partText', { required: true })
const partMale = defineModel<string>('partMale', { required: true })
const partFemale = defineModel<string>('partFemale', { required: true })
const optionalEnabledByDefault = defineModel<boolean>('optionalEnabledByDefault', { required: true })

defineProps<{
	addPartTabItems: Array<{ value: SentencePartEditorType; label: string }>
	showTypeTabs?: boolean
}>()
</script>

<template>
	<div class="grid gap-4">
		<UTabs
			v-if="showTypeTabs !== false"
			v-model="partType"
			:items="addPartTabItems"
			value-key="value"
			label-key="label"
		/>

		<UFormField v-if="partType === 'text'" label="Text" name="sentence-part-text">
			<UInput v-model="partText" placeholder="z. B. arbeitet zuverlässig mit." />
		</UFormField>

		<template v-else-if="partType === 'genderVariant'">
			<UFormField label="Männlich" name="sentence-part-male">
				<UInput v-model="partMale" placeholder="z. B. Er" />
			</UFormField>
			<UFormField label="Weiblich" name="sentence-part-female">
				<UInput v-model="partFemale" placeholder="z. B. Sie" />
			</UFormField>
		</template>

		<UFormField
			v-else-if="partType === 'optionalGroup'"
			label="Standardmäßig aktiv"
			name="sentence-part-optional"
		>
			<UCheckbox v-model="optionalEnabledByDefault" label="Gruppe ist initial eingeschaltet" />
		</UFormField>

		<p v-else-if="partType === 'name'" class="text-sm text-muted">
			Fügt einen Namensplatzhalter ein, der durch den Schülernamen ersetzt wird.
		</p>
	</div>
</template>
