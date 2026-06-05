import { useConvexClient } from 'convex-vue'
import { configureConvexAuth } from '~/utils/convexAuthClient'

export default defineNuxtPlugin(() => {
	configureConvexAuth(useConvexClient())
})
