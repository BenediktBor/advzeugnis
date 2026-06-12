import { storeToRefs } from 'pinia'
import { useConvexClient, useConvexQuery } from 'convex-vue'
import {
	AUTH_SESSION_WAIT_MS,
	clearStaleAuthSession,
	shouldClearStaleSession,
	shouldClearStaleSessionEagerly,
} from '~/utils/authSession'
import { useCurrentUserStore } from '~/stores/currentUser'
import { api } from '~/utils/convexApi'
import { getStoredAuthToken, isStoredAccessTokenExpired } from '~/utils/convexAuthClient'

export function useCurrentUser() {
	const client = useConvexClient()
	const store = useCurrentUserStore()
	store.load()
	const viewer = useConvexQuery(api.users.viewer, {}, { server: false })
	let pendingWatchdog: ReturnType<typeof setTimeout> | null = null

	function clearPendingWatchdog() {
		if (!pendingWatchdog) return
		clearTimeout(pendingWatchdog)
		pendingWatchdog = null
	}

	function maybeClearStaleSession(options?: { pendingTooLong?: boolean }) {
		if (viewer.data.value) return
		if (!shouldClearStaleSessionEagerly({
			hasToken: Boolean(getStoredAuthToken()),
			isAuthenticated: false,
			tokenExpired: isStoredAccessTokenExpired(),
			pendingTooLong: options?.pendingTooLong,
		})) return
		clearStaleAuthSession(client)
	}

	watch(
		() => viewer.isPending.value,
		(isPending) => {
			clearPendingWatchdog()
			if (!isPending || viewer.data.value) return

			if (getStoredAuthToken()) {
				maybeClearStaleSession()
			}

			if (!getStoredAuthToken()) return

			pendingWatchdog = setTimeout(() => {
				pendingWatchdog = null
				if (viewer.data.value) return
				maybeClearStaleSession({ pendingTooLong: true })
			}, AUTH_SESSION_WAIT_MS)
		},
		{ immediate: true },
	)

	if (import.meta.client) {
		onScopeDispose(clearPendingWatchdog)
	}

	watch(
		[viewer.data, viewer.isPending],
		([data, isPending]) => {
		if (!data) {
			if (!isPending) store.clearUser()
			return
		}

		const nextUser = {
			id: data.id,
			displayName: data.displayName,
			email: data.email,
			type: data.school ? 'school' : 'solo',
			role: data.school?.role,
			schoolId: data.school?.id,
			schoolName: data.school?.name,
		} as const

		const current = store.currentUser
		if (
			current.id === nextUser.id &&
			current.displayName === nextUser.displayName &&
			current.email === nextUser.email &&
			current.type === nextUser.type &&
			current.role === nextUser.role &&
			current.schoolId === nextUser.schoolId &&
			current.schoolName === nextUser.schoolName
		) return

		store.setStubUser(nextUser)
		},
		{ immediate: true },
	)
	watch(
		[viewer.data, viewer.isPending],
		([data, isPending]) => {
			if (isPending || data) return
			if (!shouldClearStaleSession({
				hasToken: Boolean(getStoredAuthToken()),
				isLoaded: true,
				isAuthenticated: false,
			})) return
			clearStaleAuthSession()
		},
	)

	const { currentUser, isLoaded, hasSchool, isAdmin, canEditTemplates, canManageTeachers } = storeToRefs(store)

	return {
		currentUser,
		isLoaded: computed(() => isLoaded.value && !viewer.isPending.value),
		isAuthenticated: computed(() => Boolean(viewer.data.value)),
		authError: viewer.error,
		hasSchool,
		isAdmin,
		canEditTemplates,
		canManageTeachers,
		setUserType: store.setUserType,
		setUserRole: store.setUserRole,
		setStubUser: store.setStubUser,
	}
}
