// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync } from 'node:fs'

function loadLocalEnv() {
	if (!existsSync('.env.local')) return {}
	const entries = readFileSync('.env.local', 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const separatorIndex = line.indexOf('=')
			if (separatorIndex === -1) return null
			const key = line.slice(0, separatorIndex).trim()
			const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '')
			return [key, value] as const
		})
		.filter((entry): entry is readonly [string, string] => entry !== null)
	return Object.fromEntries(entries)
}

const processEnv = (globalThis as {
	process?: { env?: {
		CONVEX_URL?: string
		NODE_ENV?: string
		NUXT_APP_BASE_URL?: string
		NUXT_PUBLIC_CONVEX_URL?: string
	} }
}).process?.env
const env = {
	...loadLocalEnv(),
	...processEnv,
}

const convexUrl = env.NUXT_PUBLIC_CONVEX_URL || env.CONVEX_URL
if (!convexUrl) {
	throw new Error('Missing NUXT_PUBLIC_CONVEX_URL or CONVEX_URL for Convex client configuration')
}
const isProduction = env.NODE_ENV === 'production'

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	ssr: false,
	app: {
		baseURL: env?.NUXT_APP_BASE_URL || '/',
	},
	modules: ['@nuxt/ui', 'convex-nuxt'],
	convex: {
		url: convexUrl,
		clientOptions: {
			skipConvexDeploymentUrlCheck: !isProduction,
		},
		server: false,
	},
	css: ['~/assets/css/main.css'],
})
