import { buildUnauthenticatedAppRedirect } from '~/utils/authCallback'
import { getStoredAuthToken } from '~/utils/convexAuthClient'

export default defineNuxtRouteMiddleware((to) => {
	if (!to.path.startsWith('/app')) return
	if (getStoredAuthToken()) return

	return navigateTo(buildUnauthenticatedAppRedirect(to))
})
