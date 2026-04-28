// https://nuxt.com/docs/api/configuration/nuxt-config
const env = (globalThis as {
	process?: { env?: { NUXT_APP_BASE_URL?: string } }
}).process?.env

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	ssr: false,
	app: {
		baseURL: env?.NUXT_APP_BASE_URL || '/',
	},
	modules: ['@nuxt/ui'],
	css: ['~/assets/css/main.css'],
})
