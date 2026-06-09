import type { ConvexClient } from 'convex/browser'
import isNetworkError from 'is-network-error'
import { api } from '~/utils/convexApi'

const TOKEN_KEY = 'advanced-zeugnis-convex-token'
const REFRESH_TOKEN_KEY = 'advanced-zeugnis-convex-refresh-token'
export const AUTH_TOKEN_GRACE_MS = 3_000
export const AUTH_HANDSHAKE_WAIT_MS = 15_000

const REFRESH_RETRY_BACKOFF_MS = [500, 2000]
const REFRESH_RETRY_JITTER_MS = 100

type AuthTokens = {
	token: string
	refreshToken: string
}

let signingOut = false
let lastTokenStoredAt = 0
let serverAuthConfirmed = false
let currentAccessToken: string | null = null
let pendingHandshakeResolvers: Array<(confirmed: boolean) => void> = []
let authConfigMutex: Promise<void> = Promise.resolve()

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function syncInMemoryTokenFromStorage() {
	if (typeof window === 'undefined') return
	currentAccessToken = window.localStorage.getItem(TOKEN_KEY)
}

export function beginSignOut() {
	signingOut = true
}

export function isSigningOut() {
	return signingOut
}

export function resetSignOutStateForTests() {
	signingOut = false
	lastTokenStoredAt = 0
	serverAuthConfirmed = false
	currentAccessToken = null
	pendingHandshakeResolvers = []
	authConfigMutex = Promise.resolve()
}

export function getCurrentAccessToken() {
	return currentAccessToken
}

export function getLastTokenStoredAt() {
	return lastTokenStoredAt
}

export function isWithinTokenGracePeriod(now = Date.now()) {
	return lastTokenStoredAt > 0 && now - lastTokenStoredAt < AUTH_TOKEN_GRACE_MS
}

export function isServerAuthConfirmed() {
	return serverAuthConfirmed
}

function notifyAuthHandshake(confirmed: boolean) {
	serverAuthConfirmed = confirmed
	if (!confirmed) return

	const resolvers = pendingHandshakeResolvers
	pendingHandshakeResolvers = []
	for (const resolve of resolvers) {
		resolve(true)
	}
}

export function waitForAuthHandshake(timeoutMs = AUTH_HANDSHAKE_WAIT_MS): Promise<boolean> {
	if (serverAuthConfirmed) return Promise.resolve(true)

	return new Promise((resolve) => {
		let settled = false
		const finish = (confirmed: boolean) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			pendingHandshakeResolvers = pendingHandshakeResolvers.filter((entry) => entry !== finish)
			resolve(confirmed)
		}

		pendingHandshakeResolvers.push(finish)
		const timer = setTimeout(() => finish(serverAuthConfirmed), timeoutMs)
	})
}

export function getStoredAuthToken() {
	if (currentAccessToken) return currentAccessToken
	if (typeof window === 'undefined') return null
	return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredRefreshToken() {
	if (typeof window === 'undefined') return null
	return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeAuthTokens(tokens: AuthTokens, options?: { fromRefresh?: boolean }) {
	if (signingOut) return
	currentAccessToken = tokens.token
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(TOKEN_KEY, tokens.token)
		window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
	}
	if (options?.fromRefresh) return
	lastTokenStoredAt = Date.now()
	serverAuthConfirmed = false
}

export function clearAuthTokens() {
	currentAccessToken = null
	if (typeof window === 'undefined') return
	window.localStorage.removeItem(TOKEN_KEY)
	window.localStorage.removeItem(REFRESH_TOKEN_KEY)
	lastTokenStoredAt = 0
	serverAuthConfirmed = false
}

export function finalizeClientSignOut(client: ConvexClient) {
	clearAuthTokens()
	client.setAuth(async () => null)
}

async function refreshAuthTokens(client: ConvexClient, refreshToken: string): Promise<AuthTokens | null> {
	let lastError: unknown

	for (let attempt = 0; attempt <= REFRESH_RETRY_BACKOFF_MS.length; attempt++) {
		try {
			const result = await client.action(api.auth.signIn, { refreshToken }) as {
				tokens?: AuthTokens | null
			}
			if (!result.tokens) return null
			return result.tokens
		} catch (err) {
			lastError = err
			if (!isNetworkError(err) || attempt === REFRESH_RETRY_BACKOFF_MS.length) {
				break
			}
			const wait = REFRESH_RETRY_BACKOFF_MS[attempt]! + REFRESH_RETRY_JITTER_MS * Math.random()
			await sleep(wait)
		}
	}

	console.error('[auth] token refresh failed:', lastError)
	return null
}

async function browserMutex<T>(key: string, callback: () => Promise<T>): Promise<T> {
	const lockManager = typeof window !== 'undefined' ? window.navigator?.locks : undefined
	if (lockManager !== undefined) {
		return await lockManager.request(key, callback)
	}
	return await manualMutex(key, callback)
}

type AuthMutexStore = Record<string, {
	currentlyRunning: Promise<void> | null
	waiting: Array<() => Promise<void>>
}>

function getAuthMutexGlobal() {
	const globalState = globalThis as typeof globalThis & {
		__advancedZeugnisAuthMutexes?: AuthMutexStore
	}
	if (globalState.__advancedZeugnisAuthMutexes === undefined) {
		globalState.__advancedZeugnisAuthMutexes = {}
	}
	return globalState.__advancedZeugnisAuthMutexes
}

function getMutexValue(key: string): {
	currentlyRunning: Promise<void> | null
	waiting: Array<() => Promise<void>>
} {
	const store = getAuthMutexGlobal()
	if (store[key] === undefined) {
		store[key] = { currentlyRunning: null, waiting: [] }
	}
	return store[key]!
}

function setMutexValue(
	key: string,
	value: {
		currentlyRunning: Promise<void> | null
		waiting: Array<() => Promise<void>>
	},
) {
	getAuthMutexGlobal()[key] = value
}

async function enqueueCallbackForMutex(key: string, callback: () => Promise<void>) {
	const mutex = getMutexValue(key)
	if (mutex.currentlyRunning === null) {
		setMutexValue(key, {
			currentlyRunning: callback().finally(() => {
				const nextCb = getMutexValue(key).waiting.shift()
				getMutexValue(key).currentlyRunning = null
				setMutexValue(key, {
					...getMutexValue(key),
					currentlyRunning: nextCb === undefined
						? null
						: enqueueCallbackForMutex(key, nextCb),
				})
			}),
			waiting: [],
		})
	} else {
		setMutexValue(key, {
			...mutex,
			waiting: [...mutex.waiting, callback],
		})
	}
}

async function manualMutex<T>(key: string, callback: () => Promise<T>): Promise<T> {
	return await new Promise<T>((resolve, reject) => {
		const wrappedCallback = () => callback()
			.then((value) => resolve(value))
			.catch((error) => reject(error))
		void enqueueCallbackForMutex(key, wrappedCallback)
	})
}

function mutexConfigureConvexAuth(client: ConvexClient): Promise<void> {
	const run = authConfigMutex.then(() => {
		configureConvexAuth(client)
	})
	authConfigMutex = run.catch(() => {})
	return run
}

export function configureConvexAuth(client: ConvexClient) {
	syncInMemoryTokenFromStorage()
	client.setAuth(
		async ({ forceRefreshToken }) => {
			if (signingOut) return null
			if (!forceRefreshToken) return currentAccessToken

			return await browserMutex(REFRESH_TOKEN_KEY, async () => {
				const tokenBeforeLock = currentAccessToken
				const refreshToken = getStoredRefreshToken()
				if (!refreshToken) {
					clearAuthTokens()
					return null
				}

				const tokens = await refreshAuthTokens(client, refreshToken)
				if (!tokens) {
					clearAuthTokens()
					return null
				}

				if (tokenBeforeLock !== currentAccessToken && currentAccessToken !== null) {
					return currentAccessToken
				}

				storeAuthTokens(tokens, { fromRefresh: true })
				return tokens.token
			})
		},
		(isAuthenticated) => {
			notifyAuthHandshake(isAuthenticated)
		},
	)
}

export async function applyAuthTokensAfterLogin(
	client: ConvexClient,
	tokens: AuthTokens,
	options?: { timeoutMs?: number },
): Promise<boolean> {
	storeAuthTokens(tokens)
	await mutexConfigureConvexAuth(client)
	return waitForAuthHandshake(options?.timeoutMs ?? AUTH_HANDSHAKE_WAIT_MS)
}

export function setupAuthStorageSync(
	client: ConvexClient,
	onTokensChanged: () => void,
) {
	if (typeof window === 'undefined') return () => {}

	const handler = (event: StorageEvent) => {
		if (event.storageArea !== window.localStorage) return
		if (event.key !== TOKEN_KEY && event.key !== REFRESH_TOKEN_KEY) return
		if (signingOut) return

		syncInMemoryTokenFromStorage()
		void mutexConfigureConvexAuth(client)
		onTokensChanged()
	}

	window.addEventListener('storage', handler)
	return () => window.removeEventListener('storage', handler)
}
