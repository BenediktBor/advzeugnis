import type { ConvexClient } from 'convex/browser'
import { api } from '~/utils/convexApi'

const TOKEN_KEY = 'advanced-zeugnis-convex-token'
const REFRESH_TOKEN_KEY = 'advanced-zeugnis-convex-refresh-token'

type AuthTokens = {
	token: string
	refreshToken: string
}

let signingOut = false

export function beginSignOut() {
	signingOut = true
}

export function isSigningOut() {
	return signingOut
}

export function resetSignOutStateForTests() {
	signingOut = false
}

export function getStoredAuthToken() {
	if (typeof window === 'undefined') return null
	return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredRefreshToken() {
	if (typeof window === 'undefined') return null
	return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeAuthTokens(tokens: AuthTokens) {
	if (signingOut) return
	window.localStorage.setItem(TOKEN_KEY, tokens.token)
	window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearAuthTokens() {
	if (typeof window === 'undefined') return
	window.localStorage.removeItem(TOKEN_KEY)
	window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function finalizeClientSignOut(client: ConvexClient) {
	clearAuthTokens()
	client.setAuth(async () => null)
}

export function configureConvexAuth(client: ConvexClient) {
	client.setAuth(async ({ forceRefreshToken }) => {
		if (signingOut) return null
		if (!forceRefreshToken) return getStoredAuthToken()

		const refreshToken = getStoredRefreshToken()
		if (!refreshToken) {
			clearAuthTokens()
			return null
		}

		try {
			const result = await client.action(api.auth.signIn, { refreshToken }) as {
				tokens?: AuthTokens | null
			}
			if (!result.tokens) {
				clearAuthTokens()
				return null
			}
			storeAuthTokens(result.tokens)
			return result.tokens.token
		} catch (err) {
			console.error('[auth] token refresh failed:', err)
			clearAuthTokens()
			return null
		}
	})
}
