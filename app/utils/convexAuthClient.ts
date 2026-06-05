import type { ConvexClient } from 'convex/browser'

const TOKEN_KEY = 'advanced-zeugnis-convex-token'
const REFRESH_TOKEN_KEY = 'advanced-zeugnis-convex-refresh-token'
const OAUTH_VERIFIER_KEY = 'advanced-zeugnis-oauth-verifier'

type AuthTokens = {
	token: string
	refreshToken: string
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
	window.localStorage.setItem(TOKEN_KEY, tokens.token)
	window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearAuthTokens() {
	if (typeof window === 'undefined') return
	window.localStorage.removeItem(TOKEN_KEY)
	window.localStorage.removeItem(REFRESH_TOKEN_KEY)
	window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY)
}

export function storeOauthVerifier(verifier: string) {
	window.sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier)
}

export function takeOauthVerifier() {
	const verifier = window.sessionStorage.getItem(OAUTH_VERIFIER_KEY)
	if (verifier) window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY)
	return verifier
}

export function configureConvexAuth(client: ConvexClient) {
	client.setAuth(async () => getStoredAuthToken())
}
