export function useConfirmDialog() {
	const open = ref(false)
	const title = ref('')
	const description = ref('')
	const onConfirmCallback = ref<(() => void | Promise<void>) | null>(null)

	function show(opts: { title: string; description: string; onConfirm: () => void | Promise<void> }) {
		title.value = opts.title
		description.value = opts.description
		onConfirmCallback.value = opts.onConfirm
		open.value = true
	}

	async function confirm() {
		const fn = onConfirmCallback.value
		onConfirmCallback.value = null
		if (fn) await fn()
		open.value = false
	}

	function cancel() {
		onConfirmCallback.value = null
		open.value = false
	}

	return {
		open,
		title,
		description,
		show,
		confirm,
		cancel,
	}
}
