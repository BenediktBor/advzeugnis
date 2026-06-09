import { useConvexClient } from 'convex-vue'
import { useRouter } from 'vue-router'
import {
	authCallbackParamsFromSearch,
	hasAuthCallbackParam,
	resolvePostLoginDestination,
} from '~/utils/authCallback'
import { formatAuthError } from '~/utils/authSession'
import { api } from '~/utils/convexApi'
import {
	applyAuthTokensAfterLogin,
	getStoredAuthToken,
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
				const confirmed = await applyAuthTokensAfterLogin(client, result.tokens)
				if (confirmed) {
					await router.replace(destination)
					return
				}
			}

			await router.replace({
				path: '/sign-in',
				query: { authError: '1', redirect: destination },
			})
		} catch (err) {
			console.error('[auth] sign-in callback failed:', err)
			await router.replace({
				path: '/sign-in',
				query: {
					authError: '1',
					redirect: destination,
					authMessage: encodeURIComponent(
						formatAuthError(err, 'Anmeldung konnte nicht abgeschlossen werden.'),
					),
				},
			})
		} finally {
			signingInWithCodeFromURL = false
		}
	},
})
