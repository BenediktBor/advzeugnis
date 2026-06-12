export function safeRedirectTarget(value: unknown) {
	const redirect = Array.isArray(value) ? value[0] : value
	if (typeof redirect !== 'string') return '/app'
	if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/app'
	return redirect
}

export function resolveAuthenticatedRedirectTarget(
	redirect: unknown,
	hasSchool: boolean,
	fallbackPath = '/app',
) {
	const target = safeRedirectTarget(redirect ?? fallbackPath)
	if (hasSchool && target.startsWith('/invite/')) return '/'
	return target
}

export function buildMagicLinkCallbackUrl(postLoginPath = '/app') {
	return `/sign-in?redirect=${encodeURIComponent(postLoginPath)}`
}

export function hasAuthCallbackParam(search: string) {
	const params = new URLSearchParams(search)
	return params.has('code') || params.has('token')
}

export function resolvePostLoginDestination(search: string, fallbackPath = '/app') {
	const params = new URLSearchParams(search)
	return safeRedirectTarget(params.get('redirect') ?? fallbackPath)
}

type RouteRedirectInput = {
	path: string
	fullPath: string
	query: Record<string, unknown>
}

export function buildUnauthenticatedAppRedirect(to: RouteRedirectInput) {
	const code = to.query.code
	if (typeof code === 'string' && code.length > 0) {
		return {
			path: '/sign-in',
			query: { code, redirect: to.path },
		}
	}

	return {
		path: '/sign-in',
		query: { redirect: to.fullPath },
	}
}

export function authCallbackParamsFromSearch(search: string) {
	const params = new URLSearchParams(search)
	const authParams: Record<string, string> = {}
	const code = params.get('code')
	const token = params.get('token')
	if (code) authParams.code = code
	if (token) authParams.token = token
	return authParams
}
