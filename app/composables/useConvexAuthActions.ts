import { api } from '~/utils/convexApi'
import {
	clearAuthTokens,
	storeAuthTokens,
	storeOauthVerifier,
	takeOauthVerifier,
} from '~/utils/convexAuthClient'

type SignInResult = {
	redirect?: string
	verifier?: string
	tokens?: {
		token: string
		refreshToken: string
	} | null
}

export function useConvexAuthActions() {
	const client = useConvexClient()

	async function signIn(provider = 'google', redirectTo = '/app') {
		const result = await client.action(api.auth.signIn, {
			provider,
			params: { redirectTo },
		}) as SignInResult
		if (result.verifier) storeOauthVerifier(result.verifier)
		if (result.redirect) {
			window.location.href = result.redirect
		}
		if (result.tokens) storeAuthTokens(result.tokens)
		return result
	}

	async function completeSignInFromUrl() {
		const verifier = takeOauthVerifier()
		if (!verifier) return false
		const params = Object.fromEntries(new URLSearchParams(window.location.search))
		const result = await client.action(api.auth.signIn, {
			verifier,
			params,
		}) as SignInResult
		if (!result.tokens) return false
		storeAuthTokens(result.tokens)
		return true
	}

	async function signOut() {
		try {
			await client.action(api.auth.signOut, {})
		} finally {
			clearAuthTokens()
			window.location.href = '/'
		}
	}

	return {
		signIn,
		signOut,
		completeSignInFromUrl,
	}
}
