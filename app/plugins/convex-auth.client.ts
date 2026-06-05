import { useConvexClient } from 'convex-vue'
import { configureConvexAuth } from '~/utils/convexAuthClient'

export default defineNuxtPlugin({
	name: 'convex-auth',
	enforce: 'post',
	setup() {
		configureConvexAuth(useConvexClient())
	},
})
