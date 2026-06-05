import { api } from '~/utils/convexApi'
import { clearAuthTokens, configureConvexAuth, storeAuthTokens } from '~/utils/convexAuthClient'

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

export function useConvexAuthActions() {
	const client = useConvexClient()

	function handleSignInResult(result: SignInResult) {
		if (result.redirect) {
			window.location.href = result.redirect
		}
		if (result.tokens) {
			storeAuthTokens(result.tokens)
			configureConvexAuth(client)
		}
		return {
			didStart: Boolean(result.started),
			isSignedIn: Boolean(result.tokens),
		}
	}

	async function runSignIn(provider: string | undefined, params: Record<string, string>) {
		if (provider === 'password' && params.email) {
			await client.mutation(api.users.cleanupStalePasswordAccount, { email: params.email })
		}
		const payload = provider ? { provider, params } : { params }
		const result = await client.action(api.auth.signIn, payload) as SignInResult
		return handleSignInResult(result)
	}

	async function completeSignInFromUrl() {
		const params = Object.fromEntries(new URLSearchParams(window.location.search))
		if (Object.keys(params).length === 0) return false
		const result = await client.action(api.auth.signIn, {
			params,
		}) as SignInResult
		return handleSignInResult(result).isSignedIn
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

	async function requestMagicLink(email: string, redirectTo = '/app') {
		return await runSignIn('resend', {
			email,
			redirectTo,
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
		try {
			await client.action(api.auth.signOut, {})
		} finally {
			clearAuthTokens()
			window.location.href = '/'
		}
	}

	return {
		completeSignInFromUrl,
		requestMagicLink,
		requestPasswordReset,
		resetPassword,
		signInWithPassword,
		signOut,
		signUpWithPassword,
		verifyEmail,
	}
}
