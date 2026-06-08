export type StoredTokenRedirectDecision = 'noop' | 'wait' | 'redirect' | 'clear_and_stay'

export function resolveStoredTokenRedirect({
	hasToken,
	isLoaded,
	isAuthenticated,
}: {
	hasToken: boolean
	isLoaded: boolean
	isAuthenticated: boolean
}): StoredTokenRedirectDecision {
	if (!hasToken) return 'noop'
	if (!isLoaded) return 'wait'
	if (isAuthenticated) return 'redirect'
	return 'clear_and_stay'
}
