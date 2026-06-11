import type { ConvexClient } from 'convex/browser'
import { useCurrentUserStore } from '~/stores/currentUser'
import { api } from '~/utils/convexApi'
import {
	clearAuthTokens,
	isWithinTokenGracePeriod,
	mutexConfigureConvexAuth,
	waitForAuthHandshake,
} from '~/utils/convexAuthClient'

export type StoredTokenRedirectDecision = 'noop' | 'wait' | 'redirect' | 'clear_and_stay'

export const AUTH_SESSION_WAIT_MS = 15_000
export const AUTH_POST_LOGIN_WAIT_MS = 5_000

export function resolveStoredTokenRedirect({
	hasToken,
	isLoaded,
	isAuthenticated,
	withinGracePeriod = isWithinTokenGracePeriod(),
}: {
	hasToken: boolean
	isLoaded: boolean
	isAuthenticated: boolean
	withinGracePeriod?: boolean
}): StoredTokenRedirectDecision {
	if (!hasToken) return 'noop'
	if (!isLoaded) return 'wait'
	if (isAuthenticated) return 'redirect'
	if (withinGracePeriod) return 'wait'
	return 'clear_and_stay'
}

export function clearStaleAuthSession(client?: ConvexClient) {
	clearAuthTokens()
	useCurrentUserStore().clearUser()
	if (client) {
		void mutexConfigureConvexAuth(client)
	}
}

export function shouldClearStaleSession({
	hasToken,
	isLoaded,
	isAuthenticated,
	withinGracePeriod = isWithinTokenGracePeriod(),
}: {
	hasToken: boolean
	isLoaded: boolean
	isAuthenticated: boolean
	withinGracePeriod?: boolean
}): boolean {
	if (!hasToken || !isLoaded || isAuthenticated) return false
	if (withinGracePeriod) return false
	return true
}

export async function waitForAuthenticatedSession(
	getState: () => { isAuthenticated: boolean, isLoaded: boolean },
	options?: { timeoutMs?: number, pollMs?: number },
): Promise<boolean> {
	const timeoutMs = options?.timeoutMs ?? AUTH_SESSION_WAIT_MS
	const pollMs = options?.pollMs ?? 100
	const deadline = Date.now() + timeoutMs

	const handshakePromise = waitForAuthHandshake(timeoutMs)

	while (Date.now() < deadline) {
		const { isAuthenticated } = getState()
		if (isAuthenticated) {
			return true
		}
		await new Promise((resolve) => setTimeout(resolve, pollMs))
	}

	const handshakeConfirmed = await handshakePromise
	return handshakeConfirmed || getState().isAuthenticated
}

async function queryViewerWithTimeout(
	client: ConvexClient,
	timeoutMs: number,
): Promise<unknown | null> {
	try {
		return await Promise.race([
			client.query(api.users.viewer, {}),
			new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
		])
	} catch {
		return null
	}
}

/** Last-resort utility; prefer waitForAuthenticatedSession with reactive state. */
export async function waitForAuthenticatedSessionWithClient(
	client: ConvexClient,
	options?: { timeoutMs?: number, pollMs?: number, queryTimeoutMs?: number },
): Promise<boolean> {
	const timeoutMs = options?.timeoutMs ?? AUTH_SESSION_WAIT_MS
	const pollMs = options?.pollMs ?? 100
	const queryTimeoutMs = options?.queryTimeoutMs ?? 2_000
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		const viewer = await queryViewerWithTimeout(client, queryTimeoutMs)
		if (viewer) return true
		await new Promise((resolve) => setTimeout(resolve, pollMs))
	}

	const viewer = await queryViewerWithTimeout(client, queryTimeoutMs)
	return viewer !== null
}

export function formatAuthError(err: unknown, fallback: string): string {
	const message = extractConvexErrorMessage(err)
	if (!message) return fallback

	const lower = message.toLowerCase()
	if (lower.includes('invalid credentials')) {
		return 'E-Mail oder Passwort ist falsch.'
	}
	if (lower.includes('invalid email')) {
		return 'Ungueltige E-Mail-Adresse.'
	}
	if (lower.includes('password must be at least')) {
		return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
	}
	if (lower.includes('invalid code')) {
		return 'Bestaetigungscode ist ungueltig oder abgelaufen.'
	}
	if (lower.includes('email is required')) {
		return 'Bitte gib deine E-Mail-Adresse ein.'
	}

	return fallback
}

function extractConvexErrorMessage(err: unknown): string | null {
	if (err && typeof err === 'object' && 'data' in err) {
		const data = (err as { data: unknown }).data
		if (typeof data === 'string') return data
	}
	if (err instanceof Error) {
		return err.message.replace(/^ConvexError:\s*/i, '').trim() || null
	}
	return null
}
