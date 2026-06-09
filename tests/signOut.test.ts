import { describe, expect, it, beforeEach, vi } from 'vitest'
import { resolveStoredTokenRedirect } from '~/utils/authSession'
import {
	beginSignOut,
	clearAuthTokens,
	configureConvexAuth,
	getStoredAuthToken,
	getStoredRefreshToken,
	resetSignOutStateForTests,
	storeAuthTokens,
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

describe('sign out guard', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createLocalStorageMock())
		vi.stubGlobal('window', { localStorage })
		resetSignOutStateForTests()
	})

	it('blocks storeAuthTokens while signing out', () => {
		beginSignOut()
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		expect(getStoredAuthToken()).toBeNull()
		expect(getStoredRefreshToken()).toBeNull()
	})

	it('configureConvexAuth does not refresh or store tokens while signing out', async () => {
		localStorage.setItem('advanced-zeugnis-convex-refresh-token', 'refresh')
		const action = vi.fn()
		const client = {
			action,
			setAuth: vi.fn((
				callback: (args: { forceRefreshToken: boolean }) => Promise<string | null>,
				_onChange?: (confirmed: boolean) => void,
			) => {
				client.authCallback = callback
			}),
			authCallback: null as null | ((args: { forceRefreshToken: boolean }) => Promise<string | null>),
		}

		configureConvexAuth(client as never)
		beginSignOut()

		const token = await client.authCallback!({ forceRefreshToken: true })
		expect(token).toBeNull()
		expect(action).not.toHaveBeenCalled()
		expect(getStoredAuthToken()).toBeNull()
	})

	it('configureConvexAuth returns null for stored token reads while signing out', async () => {
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		const client = {
			action: vi.fn(),
			setAuth: vi.fn((
				callback: (args: { forceRefreshToken: boolean }) => Promise<string | null>,
				_onChange?: (confirmed: boolean) => void,
			) => {
				client.authCallback = callback
			}),
			authCallback: null as null | ((args: { forceRefreshToken: boolean }) => Promise<string | null>),
		}

		configureConvexAuth(client as never)
		beginSignOut()

		const token = await client.authCallback!({ forceRefreshToken: false })
		expect(token).toBeNull()
	})

	it('clearAuthTokens removes both token keys', () => {
		storeAuthTokens({ token: 'access', refreshToken: 'refresh' })
		clearAuthTokens()
		expect(getStoredAuthToken()).toBeNull()
		expect(getStoredRefreshToken()).toBeNull()
	})

	it('retries token refresh on network errors before clearing tokens', async () => {
		vi.useFakeTimers()
		localStorage.setItem('advanced-zeugnis-convex-refresh-token', 'refresh')
		const networkError = new TypeError('Failed to fetch')
		const action = vi.fn()
			.mockRejectedValueOnce(networkError)
			.mockResolvedValueOnce({
				tokens: { token: 'new-access', refreshToken: 'new-refresh' },
			})
		const client = {
			action,
			setAuth: vi.fn((
				callback: (args: { forceRefreshToken: boolean }) => Promise<string | null>,
				_onChange?: (confirmed: boolean) => void,
			) => {
				client.authCallback = callback
			}),
			authCallback: null as null | ((args: { forceRefreshToken: boolean }) => Promise<string | null>),
		}

		configureConvexAuth(client as never)
		const refreshPromise = client.authCallback!({ forceRefreshToken: true })
		await vi.advanceTimersByTimeAsync(600)
		const token = await refreshPromise

		expect(token).toBe('new-access')
		expect(action).toHaveBeenCalledTimes(2)
		expect(getStoredAuthToken()).toBe('new-access')
		vi.useRealTimers()
	})
})

describe('resolveStoredTokenRedirect', () => {
	it('does nothing when no token is stored', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: false,
			isLoaded: false,
			isAuthenticated: false,
		})).toBe('noop')
	})

	it('waits while auth state is still loading', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: true,
			isLoaded: false,
			isAuthenticated: false,
		})).toBe('wait')
	})

	it('redirects only when the stored session is authenticated', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: true,
		})).toBe('redirect')
	})

	it('clears stale tokens when loaded but unauthenticated outside grace period', () => {
		expect(resolveStoredTokenRedirect({
			hasToken: true,
			isLoaded: true,
			isAuthenticated: false,
			withinGracePeriod: false,
		})).toBe('clear_and_stay')
	})
})
