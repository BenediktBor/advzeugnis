import { getStoredAuthToken } from '~/utils/convexAuthClient'

export default defineNuxtRouteMiddleware((to) => {
	if (!to.path.startsWith('/app')) return
	if (getStoredAuthToken()) return

	return navigateTo({
		path: '/sign-in',
		query: { redirect: to.fullPath },
	})
})
