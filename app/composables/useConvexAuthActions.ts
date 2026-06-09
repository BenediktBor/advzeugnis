import { useConvexClient } from 'convex-vue'
import isNetworkError from 'is-network-error'
import { buildMagicLinkCallbackUrl } from '~/utils/authCallback'
import { api } from '~/utils/convexApi'
import { useCurrentUserStore } from '~/stores/currentUser'
import {
	applyAuthTokensAfterLogin,
	beginSignOut,
	finalizeClientSignOut,
} from '~/utils/convexAuthClient'

const SIGN_IN_RETRY_BACKOFF_MS = [500, 2000]
const SIGN_IN_RETRY_JITTER_MS = 100

type SignInResult = {
	redirect?: string
	started?: boolean
	tokens?: {
		token: string
		refreshToken: string
	} | null
}

type PasswordCredentials = {
	email: string
	password: string
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useConvexAuthActions() {
	const client = useConvexClient()

	async function handleSignInResult(result: SignInResult) {
		if (result.redirect) {
			window.location.href = result.redirect
		}
		let isSignedIn = false
		if (result.tokens) {
			isSignedIn = await applyAuthTokensAfterLogin(client, result.tokens)
		}
		return {
			didStart: Boolean(result.started),
			isSignedIn,
		}
	}

	async function runSignIn(provider: string | undefined, params: Record<string, string>) {
		const payload = provider ? { provider, params } : { params }
		let lastError: unknown

		for (let attempt = 0; attempt <= SIGN_IN_RETRY_BACKOFF_MS.length; attempt++) {
			try {
				const result = await client.action(api.auth.signIn, payload) as SignInResult
				return await handleSignInResult(result)
			} catch (err) {
				lastError = err
				if (!isNetworkError(err) || attempt === SIGN_IN_RETRY_BACKOFF_MS.length) {
					break
				}
				const wait = SIGN_IN_RETRY_BACKOFF_MS[attempt]! + SIGN_IN_RETRY_JITTER_MS * Math.random()
				await sleep(wait)
			}
		}

		throw lastError
	}

	async function signUpWithPassword(credentials: PasswordCredentials) {
		return await runSignIn('password', {
			email: credentials.email,
			password: credentials.password,
			flow: 'signUp',
		})
	}

	async function signInWithPassword(credentials: Omit<PasswordCredentials, 'name'>) {
		return await runSignIn('password', {
			email: credentials.email,
			password: credentials.password,
			flow: 'signIn',
		})
	}

	async function verifyEmail(email: string, code: string) {
		return await runSignIn('password', {
			email,
			code,
			flow: 'email-verification',
		})
	}

	async function requestMagicLink(email: string, postLoginPath = '/app') {
		return await runSignIn('resend', {
			email,
			redirectTo: buildMagicLinkCallbackUrl(postLoginPath),
		})
	}

	async function requestPasswordReset(email: string) {
		return await runSignIn('password', {
			email,
			flow: 'reset',
		})
	}

	async function resetPassword(email: string, code: string, newPassword: string) {
		return await runSignIn('password', {
			email,
			code,
			newPassword,
			flow: 'reset-verification',
		})
	}

	async function signOut() {
		beginSignOut()
		try {
			await client.action(api.auth.signOut, {})
		} finally {
			finalizeClientSignOut(client)
			useCurrentUserStore().clearUser()
			window.location.href = '/'
		}
	}

	return {
		requestMagicLink,
		requestPasswordReset,
		resetPassword,
		signInWithPassword,
		signOut,
		signUpWithPassword,
		verifyEmail,
	}
}
