import { ConvexError } from 'convex/values'

declare const process: {
	env: {
		SITE_URL?: string
		STRIPE_PRICE_ID?: string
	}
}

function requireEnv(name: 'SITE_URL' | 'STRIPE_PRICE_ID') {
	const value = process.env[name]?.trim()
	if (!value) throw new ConvexError(`Missing ${name}`)
	return value
}

export function getSiteUrl() {
	const url = requireEnv('SITE_URL').replace(/\/+$/, '')
	try {
		const parsed = new URL(url)
		if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
			throw new ConvexError('SITE_URL must use HTTPS in production')
		}
		return parsed.origin
	} catch (err) {
		if (err instanceof ConvexError) throw err
		throw new ConvexError('SITE_URL must be a valid URL')
	}
}

export function getStripePriceId() {
	return requireEnv('STRIPE_PRICE_ID')
}

export function buildAppUrl(path: string) {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`
	return `${getSiteUrl()}${normalizedPath}`
}
