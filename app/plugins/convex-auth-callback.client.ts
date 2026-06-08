import { useConvexClient } from 'convex-vue'
import { useRouter } from 'vue-router'
import {
	authCallbackParamsFromSearch,
	hasAuthCallbackParam,
	resolvePostLoginDestination,
} from '~/utils/authCallback'
import { api } from '~/utils/convexApi'
import {
	configureConvexAuth,
	getStoredAuthToken,
	storeAuthTokens,
} from '~/utils/convexAuthClient'

let signingInWithCodeFromURL = false

export default defineNuxtPlugin({
	name: 'convex-auth-callback',
	enforce: 'post',
	dependsOn: ['convex-auth'],
	async setup() {
		if (!import.meta.client) return

		const search = window.location.search
		if (!hasAuthCallbackParam(search) || getStoredAuthToken() || signingInWithCodeFromURL) {
			return
		}

		signingInWithCodeFromURL = true
		const router = useRouter()
		const client = useConvexClient()
		const destination = resolvePostLoginDestination(search)

		try {
			const authParams = authCallbackParamsFromSearch(search)
			const result = await client.action(api.auth.signIn, { params: authParams }) as {
				tokens?: { token: string, refreshToken: string } | null
			}

			if (result.tokens) {
				storeAuthTokens(result.tokens)
				configureConvexAuth(client)
				await router.replace(destination)
				return
			}

			await router.replace({
				path: '/sign-in',
				query: { authError: '1', redirect: destination },
			})
		} catch (err) {
			console.error('[auth] sign-in callback failed:', err)
			await router.replace({
				path: '/sign-in',
				query: { authError: '1', redirect: destination },
			})
		} finally {
			signingInWithCodeFromURL = false
		}
	},
})
