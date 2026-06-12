import { useConvexClient } from 'convex-vue'
import { useCurrentUserStore } from '~/stores/currentUser'
import { clearStaleAuthSession } from '~/utils/authSession'
import {
	configureConvexAuth,
	getStoredAuthToken,
	isStoredAccessTokenExpired,
	setupAuthStorageSync,
} from '~/utils/convexAuthClient'

export default defineNuxtPlugin({
	name: 'convex-auth',
	enforce: 'post',
	setup() {
		const client = useConvexClient()
		if (import.meta.client && getStoredAuthToken() && isStoredAccessTokenExpired()) {
			clearStaleAuthSession(client)
		}
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
