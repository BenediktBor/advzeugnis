<script setup lang="ts">
const model = defineModel<string>({ required: true })

const props = withDefaults(
	defineProps<{
		placeholder?: string
		autofocus?: boolean
		submitOnEnter?: boolean
	}>(),
	{
		autofocus: false,
		submitOnEnter: true,
	},
)

const emit = defineEmits<{
	submit: []
}>()

function sanitize(value: string | null | undefined): string {
	return (value ?? '').replace(/\r?\n/g, ' ')
}

const sanitized = computed({
	get: () => model.value ?? '',
	set: (value: string | null | undefined) => {
		model.value = sanitize(value)
	},
})

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter') return
	event.preventDefault()
	if (props.submitOnEnter && !event.shiftKey) {
		emit('submit')
	}
}
</script>

<template>
	<UTextarea
		v-model="sanitized"
		:rows="3"
		autoresize
		:maxrows="8"
		class="w-full"
		:autofocus="autofocus"
		:placeholder="placeholder"
		@keydown="onKeydown"
	/>
</template>
