import { useConvexClient } from 'convex-vue'
import { useCurrentUserStore } from '~/stores/currentUser'
import { configureConvexAuth, getStoredAuthToken, setupAuthStorageSync } from '~/utils/convexAuthClient'

export default defineNuxtPlugin({
	name: 'convex-auth',
	enforce: 'post',
	setup() {
		const client = useConvexClient()
		configureConvexAuth(client)

		const removeStorageSync = setupAuthStorageSync(client, () => {
			const store = useCurrentUserStore()
			if (!getStoredAuthToken()) {
				store.clearUser()
			}
		})

		if (import.meta.client) {
			onScopeDispose(removeStorageSync)
		}
	},
})
