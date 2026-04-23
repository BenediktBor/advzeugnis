import { watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Redirects once `isLoaded` becomes true if the requested resource doesn't exist.
 * This is intended to replace page-local ad-hoc `watch(...)` redirect logic.
 */
export function useLoadedMissingRedirect<T>({
	id,
	isLoaded,
	exists,
	redirectTo,
	onMissing,
}: {
	id: Ref<string | null | undefined>
	isLoaded: Ref<boolean>
	/**
	 * Truthy means "exists". For boolean existence checks, pass `exists` as a computed boolean.
	 */
	exists: Ref<T | boolean | null | undefined>
	redirectTo: string
	onMissing?: () => void
}) {
	const router = useRouter()
	const nuxtApp = useNuxtApp()

	watch(
		[exists, id, isLoaded],
		([e, idVal, loaded]) => {
			if (loaded && idVal && !e) {
				nuxtApp.runWithContext(() => {
					onMissing?.()
					router.replace(redirectTo)
				})
			}
		},
		{ immediate: true },
	)
}

