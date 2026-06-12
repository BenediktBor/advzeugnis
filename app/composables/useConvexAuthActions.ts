import { useConvexClient } from 'convex-vue'
import isNetworkError from 'is-network-error'
import { buildMagicLinkCallbackUrl } from '~/utils/authCallback'
import { clearStaleAuthSession } from '~/utils/authSession'
import { api } from '~/utils/convexApi'
import { useCurrentUserStore } from '~/stores/currentUser'
import {
	applyAuthTokensAfterLogin,
	beginSignOut,
	finalizeClientSignOut,
} from '~/utils/convexAuthClient'

const SIGN_IN_RETRY_BACKOFF_MS = [500, 2000]
const SIGN_IN_RETRY_JITTER_MS = 100
export const SIGN_IN_TIMEOUT_MS = 20_000
export const SIGN_IN_TIMEOUT_MESSAGE = 'Anmeldung hat zu lange gedauert. Bitte erneut versuchen.'

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

class SignInTimeoutError extends Error {
	constructor() {
		super(SIGN_IN_TIMEOUT_MESSAGE)
		this.name = 'SignInTimeoutError'
	}
}

async function runSignInAction(
	client: ReturnType<typeof useConvexClient>,
	payload: Record<string, unknown>,
): Promise<SignInResult> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined

	try {
		return await Promise.race([
			client.action(api.auth.signIn, payload) as Promise<SignInResult>,
			new Promise<SignInResult>((_, reject) => {
				timeoutId = setTimeout(() => reject(new SignInTimeoutError()), SIGN_IN_TIMEOUT_MS)
			}),
		])
	} finally {
		if (timeoutId) clearTimeout(timeoutId)
	}
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
				const result = await runSignInAction(client, payload)
				return await handleSignInResult(result)
			} catch (err) {
				lastError = err
				if (err instanceof SignInTimeoutError) {
					clearStaleAuthSession(client)
					break
				}
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
