// https://nuxt.com/docs/api/configuration/nuxt-config
const env = (globalThis as {
	process?: { env?: {
		NUXT_APP_BASE_URL?: string
		NUXT_PUBLIC_CONVEX_URL?: string
		NUXT_PUBLIC_STRIPE_PRICE_ID?: string
		NUXT_PUBLIC_SITE_URL?: string
	} }
}).process?.env

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	ssr: false,
	app: {
		baseURL: env?.NUXT_APP_BASE_URL || '/',
	},
	modules: ['@nuxt/ui', 'convex-nuxt'],
	convex: {
		url: env?.NUXT_PUBLIC_CONVEX_URL || 'https://placeholder.convex.cloud',
		clientOptions: {
			skipConvexDeploymentUrlCheck: true,
		},
		server: false,
	},
	runtimeConfig: {
		public: {
			stripePriceId: env?.NUXT_PUBLIC_STRIPE_PRICE_ID || '',
			siteUrl: env?.NUXT_PUBLIC_SITE_URL || '',
		},
	},
	css: ['~/assets/css/main.css'],
})
