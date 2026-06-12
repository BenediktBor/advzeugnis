import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useCurrentUserStore } from '~/stores/currentUser'
import {
	clearStaleAuthSession,
	formatAuthError,
	resolveStoredTokenRedirect,
	shouldClearStaleSession,
	shouldClearStaleSessionEagerly,
	waitForAuthenticatedSession,
	waitForAuthenticatedSessionWithClient,
} from '~/utils/authSession'
import {
	applyAuthTokensAfterLogin,
	AUTH_TOKEN_GRACE_MS,
	AUTH_TOKEN_EXPIRY_LEEWAY_SEC,
	configureConvexAuth,
	decodeJwtPayload,
	getCurrentAccessToken,
	getLastTokenStoredAt,
	isAccessTokenExpired,
	isStoredAccessTokenExpired,
	isWithinTokenGracePeriod,
	resetSignOutStateForTests,
	storeAuthTokens,
	waitForAuthHandshake,
} from '~/utils/convexAuthClient'

function createLocalStorageMock() {
	const storage = new Map<string, string>()
	return {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			storage.set(key, value)
		},
		removeItem: (key: string) => {
			storage.delete(key)
		},
		clear: () => {
			storage.clear()
		},
	}
}

function makeTestJwt(exp: number) {
	const encode = (value: Record<string, unknown>) =>
		Buffer.from(JSON.stringify(value)).toString('base64url')

	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp })}.signature`
}

describe('resolveStoredTokenRedirect grace period', () => {
	it('waits instead of clearing during the post-login grace period', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: false,
			withinGracePeriod: true,
		})).toBe('wait')
	})

	it('clears stale tokens after the grace period expires', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: false,
			withinGracePeriod: false,
		})).toBe('clear_and_stay')
	})
})

describe('shouldClearStaleSession', () => {
	it('does not clear tokens during the grace period', () => {
		expect(shouldClearStaleSession({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: false,
			withinGracePeriod: true,
		})).toBe(false)
	})

	it('clears tokens once loaded and still unauthenticated outside grace period', () => {
		expect(shouldClearStaleSession({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: false,
			withinGracePeriod: false,
		})).toBe(true)
	})
})

describe('shouldClearStaleSessionEagerly', () => {
	it('clears expired tokens without waiting for isLoaded', () => {
		expect(shouldClearStaleSessionEagerly({
			hasToken: true,
			isAuthenticated: false,
			tokenExpired: true,
		})).toBe(true)
	})

	it('clears when auth has been pending too long', () => {
		expect(shouldClearStaleSessionEagerly({
			hasToken: true,
			isAuthenticated: false,
			tokenExpired: false,
			pendingTooLong: true,
		})).toBe(true)
	})

	it('does not clear during the post-login grace period', () => {
		expect(shouldClearStaleSessionEagerly({
			hasToken: true,
			isAuthenticated: false,
			tokenExpired: true,
			withinGracePeriod: true,
		})).toBe(false)
	})

	it('does nothing when already authenticated', () => {
		expect(shouldClearStaleSessionEagerly({
			hasToken: true,
			isAuthenticated: true,
			tokenExpired: true,
		})).toBe(false)
	})
})

describe('jwt expiry helpers', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createLocalStorageMock())
		vi.stubGlobal('window', { localStorage })
		resetSignOutStateForTests()
	})

	it('decodes jwt payload', () => {
		const token = makeTestJwt(1_900_000_000)
		expect(decodeJwtPayload(token)).toEqual({ exp: 1_900_000_000 })
	})

	it('treats expired access tokens as expired', () => {
		const expiredToken = makeTestJwt(1)
		const validToken = makeTestJwt(Math.floor(Date.now() / 1000) + 3600)

		expect(isAccessTokenExpired(expiredToken)).toBe(true)
		expect(isAccessTokenExpired(validToken)).toBe(false)
		expect(isAccessTokenExpired(null)).toBe(true)
	})

	it('detects expired stored access tokens', () => {
		storeAuthTokens({
			token: makeTestJwt(1),
			refreshToken: 'refresh',
		})

		expect(isStoredAccessTokenExpired()).toBe(true)
	})

	it('respects expiry leeway for nearly expired tokens', () => {
		const almostExpired = makeTestJwt(Math.floor(Date.now() / 1000) + AUTH_TOKEN_EXPIRY_LEEWAY_SEC - 5)
		expect(isAccessTokenExpired(almostExpired)).toBe(true)
	})
})

describe('token grace period', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createLocalStorageMock())
		vi.stubGlobal('window', { localStorage })
		resetSignOutStateForTests()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('marks freshly stored tokens as within the grace period', () => {
		vi.useFakeTimers()
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		expect(getCurrentAccessToken()).toBe('access')
		expect(getLastTokenStoredAt()).toBeGreaterThan(0)
		expect(isWithinTokenGracePeriod()).toBe(true)

		vi.advanceTimersByTime(AUTH_TOKEN_GRACE_MS)
		expect(isWithinTokenGracePeriod()).toBe(false)
	})

	it('does not reset grace period when storing tokens from refresh', () => {
		vi.useFakeTimers()
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		const initialStoredAt = getLastTokenStoredAt()

		vi.advanceTimersByTime(AUTH_TOKEN_GRACE_MS)
		expect(isWithinTokenGracePeriod()).toBe(false)

		storeAuthTokens(
			{ token: 'new-access', refreshToken: 'new-refresh' },
			{ fromRefresh: true },
		)
		expect(getLastTokenStoredAt()).toBe(initialStoredAt)
		expect(isWithinTokenGracePeriod()).toBe(false)
	})
})

describe('waitForAuthenticatedSession', () => {
	it('resolves true once viewer state becomes authenticated', async () => {
		let isAuthenticated = false
		let isLoaded = false

		const waitPromise = waitForAuthenticatedSession(
			() => ({ isAuthenticated, isLoaded }),
			{ timeoutMs: 1_000, pollMs: 10 },
		)

		setTimeout(() => {
			isLoaded = true
			isAuthenticated = true
		}, 50)

		await expect(waitPromise).resolves.toBe(true)
	})

	it('resolves false when the session never becomes authenticated', async () => {
		await expect(waitForAuthenticatedSession(
			() => ({ isAuthenticated: false, isLoaded: true }),
			{ timeoutMs: 100, pollMs: 10 },
		)).resolves.toBe(false)
	})

	it('resolves true when authenticated even if viewer is still pending', async () => {
		await expect(waitForAuthenticatedSession(
			() => ({ isAuthenticated: true, isLoaded: false }),
			{ timeoutMs: 100, pollMs: 10 },
		)).resolves.toBe(true)
	})

	it('resolves true when handshake confirms without loaded viewer state', async () => {
		let onAuthChange: ((confirmed: boolean) => void) | undefined
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((_callback, onChange: (confirmed: boolean) => void) => {
				onAuthChange = onChange
			}),
		}

		configureConvexAuth(client as never)
		const waitPromise = waitForAuthenticatedSession(
			() => ({ isAuthenticated: false, isLoaded: false }),
			{ timeoutMs: 200, pollMs: 20 },
		)

		setTimeout(() => onAuthChange!(true), 30)
		await expect(waitPromise).resolves.toBe(true)
	})
})

describe('waitForAuthenticatedSessionWithClient', () => {
	beforeEach(() => {
		resetSignOutStateForTests()
	})

	it('resolves true when viewer query returns a user', async () => {
		let calls = 0
		const client = {
			query: vi.fn(async () => {
				calls++
				return calls >= 2 ? { id: 'user-1' } : null
			}),
		}

		await expect(waitForAuthenticatedSessionWithClient(client as never, {
			timeoutMs: 1_000,
			pollMs: 10,
		})).resolves.toBe(true)
	})

	it('resolves false when viewer stays null', async () => {
		const client = {
			query: vi.fn(async () => null),
		}

		await expect(waitForAuthenticatedSessionWithClient(client as never, {
			timeoutMs: 100,
			pollMs: 10,
		})).resolves.toBe(false)
	})

	it('does not hang when client.query never settles', async () => {
		const client = {
			query: vi.fn(() => new Promise(() => {})),
		}

		await expect(waitForAuthenticatedSessionWithClient(client as never, {
			timeoutMs: 150,
			pollMs: 10,
			queryTimeoutMs: 50,
		})).resolves.toBe(false)
	})
})

describe('applyAuthTokensAfterLogin', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createLocalStorageMock())
		vi.stubGlobal('window', { localStorage })
		resetSignOutStateForTests()
	})

	it('stores tokens in memory and awaits handshake before resolving', async () => {
		let onAuthChange: ((confirmed: boolean) => void) | undefined
		let setAuthCalls = 0
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((_callback, onChange: (confirmed: boolean) => void) => {
				setAuthCalls++
				onAuthChange = onChange
			}),
		}

		const applyPromise = applyAuthTokensAfterLogin(client as never, {
			token: 'access',
			refreshToken: 'refresh',
		}, { timeoutMs: 500 })

		await vi.waitFor(() => expect(setAuthCalls).toBe(1))
		expect(getCurrentAccessToken()).toBe('access')

		onAuthChange!(true)
		await expect(applyPromise).resolves.toBe(true)
	})

	it('serializes concurrent applyAuthTokensAfterLogin calls', async () => {
		let setAuthCalls = 0
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((_callback, onChange: (confirmed: boolean) => void) => {
				setAuthCalls++
				onChange(true)
			}),
		}

		await Promise.all([
			applyAuthTokensAfterLogin(client as never, { token: 'a1', refreshToken: 'r1' }),
			applyAuthTokensAfterLogin(client as never, { token: 'a2', refreshToken: 'r2' }),
		])

		expect(setAuthCalls).toBe(2)
		expect(getCurrentAccessToken()).toBe('a2')
	})
})

describe('waitForAuthHandshake', () => {
	beforeEach(() => {
		resetSignOutStateForTests()
	})

	it('resolves when configureConvexAuth onChange confirms auth', async () => {
		let onAuthChange: ((confirmed: boolean) => void) | undefined
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((_callback, onChange: (confirmed: boolean) => void) => {
				onAuthChange = onChange
			}),
		}

		configureConvexAuth(client as never)
		const waitPromise = waitForAuthHandshake(500)
		onAuthChange!(true)

		await expect(waitPromise).resolves.toBe(true)
	})

	it('resolves false when configureConvexAuth onChange rejects auth', async () => {
		let onAuthChange: ((confirmed: boolean) => void) | undefined
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((_callback, onChange: (confirmed: boolean) => void) => {
				onAuthChange = onChange
			}),
		}

		configureConvexAuth(client as never)
		const waitPromise = waitForAuthHandshake(5_000)
		onAuthChange!(false)

		await expect(waitPromise).resolves.toBe(false)
	})
})

describe('clearStaleAuthSession', () => {
	beforeEach(() => {
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).ref = ref
		;(globalThis as { ref?: typeof ref; computed?: typeof computed }).computed = computed
		vi.stubGlobal('localStorage', createLocalStorageMock())
		vi.stubGlobal('window', { localStorage })
		setActivePinia(createPinia())
		resetSignOutStateForTests()
	})

	it('clears stored tokens and resets the current user store', () => {
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		const store = useCurrentUserStore()
		store.setStubUser({
			id: 'user-1',
			displayName: 'Test User',
			email: 'test@example.com',
			type: 'solo',
		})

		clearStaleAuthSession()

		expect(getCurrentAccessToken()).toBeNull()
		expect(store.currentUser.displayName).toBe('Demo Benutzer')
	})
})

describe('formatAuthError', () => {
	it('maps invalid credentials to a German message', () => {
		expect(formatAuthError(new Error('ConvexError: Invalid credentials'), 'fallback')).toBe(
			'E-Mail oder Passwort ist falsch.',
		)
	})

	it('falls back when no server message is available', () => {
		expect(formatAuthError(new Error('network down'), 'Anmeldung fehlgeschlagen.')).toBe(
			'Anmeldung fehlgeschlagen.',
		)
	})

	it('returns timeout message unchanged', () => {
		expect(formatAuthError(
			new Error('Anmeldung hat zu lange gedauert. Bitte erneut versuchen.'),
			'fallback',
		)).toBe('Anmeldung hat zu lange gedauert. Bitte erneut versuchen.')
	})
})
