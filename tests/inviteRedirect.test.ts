import { describe, expect, it } from 'vitest'
import { resolveAuthenticatedRedirectTarget } from '~/utils/authCallback'

describe('resolveAuthenticatedRedirectTarget', () => {
	it('redirects school members away from invite links to the homepage', () => {
		expect(resolveAuthenticatedRedirectTarget('/invite/abc', true)).toBe('/')
	})

	it('preserves invite redirect for users without a school', () => {
		expect(resolveAuthenticatedRedirectTarget('/invite/abc', false)).toBe('/invite/abc')
	})

	it('preserves non-invite redirects for school members', () => {
		expect(resolveAuthenticatedRedirectTarget('/app', true)).toBe('/app')
		expect(resolveAuthenticatedRedirectTarget('/app/students', true)).toBe('/app/students')
	})
})
