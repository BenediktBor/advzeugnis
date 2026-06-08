import { describe, expect, it } from 'vitest'
import {
	authCallbackParamsFromSearch,
	buildMagicLinkCallbackUrl,
	buildUnauthenticatedAppRedirect,
	hasAuthCallbackParam,
	resolvePostLoginDestination,
	safeRedirectTarget,
} from '~/utils/authCallback'

describe('magic link callback helpers', () => {
	it('builds sign-in callback urls with encoded post-login redirect', () => {
		expect(buildMagicLinkCallbackUrl('/app')).toBe('/sign-in?redirect=%2Fapp')
		expect(buildMagicLinkCallbackUrl('/invite/abc')).toBe('/sign-in?redirect=%2Finvite%2Fabc')
	})

	it('detects auth callback params in search strings', () => {
		expect(hasAuthCallbackParam('?code=abc')).toBe(true)
		expect(hasAuthCallbackParam('?token=abc')).toBe(true)
		expect(hasAuthCallbackParam('?redirect=%2Fapp')).toBe(false)
	})

	it('extracts only auth params for sign-in exchange', () => {
		expect(authCallbackParamsFromSearch('?code=abc&redirect=%2Fapp')).toEqual({ code: 'abc' })
		expect(authCallbackParamsFromSearch('?token=xyz&authError=1')).toEqual({ token: 'xyz' })
		expect(authCallbackParamsFromSearch('?redirect=%2Fapp')).toEqual({})
	})

	it('resolves post-login destination from redirect query', () => {
		expect(resolvePostLoginDestination('?redirect=%2Finvite%2Fabc')).toBe('/invite/abc')
		expect(resolvePostLoginDestination('?code=abc')).toBe('/app')
	})

	it('rejects unsafe redirect targets', () => {
		expect(safeRedirectTarget('//evil.example')).toBe('/app')
		expect(safeRedirectTarget('https://evil.example')).toBe('/app')
		expect(safeRedirectTarget('/app/students')).toBe('/app/students')
	})

	it('preserves code at top level when auth middleware redirects from /app', () => {
		expect(buildUnauthenticatedAppRedirect({
			path: '/app',
			fullPath: '/app?code=abc123',
			query: { code: 'abc123' },
		})).toEqual({
			path: '/sign-in',
			query: { code: 'abc123', redirect: '/app' },
		})
	})

	it('keeps legacy redirect behavior when no code is present', () => {
		expect(buildUnauthenticatedAppRedirect({
			path: '/app/students',
			fullPath: '/app/students',
			query: {},
		})).toEqual({
			path: '/sign-in',
			query: { redirect: '/app/students' },
		})
	})
})
