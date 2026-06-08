import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

export const SITE_NAME = 'AdvancedZeugnis'

export const SITE_DEFAULT_DESCRIPTION =
	'Schüler verwalten, Satzvorlagen bearbeiten und Zeugnisse effizient erstellen — solo oder im Schulteam.'

export const APP_ROBOTS = 'noindex, nofollow'

function formatPageTitle(pageTitle?: string | null) {
	return pageTitle?.trim() ? `${pageTitle.trim()} – ${SITE_NAME}` : SITE_NAME
}

export type AppSeoOptions = {
	title?: MaybeRefOrGetter<string | undefined>
	description?: MaybeRefOrGetter<string | undefined>
	robots?: MaybeRefOrGetter<string | undefined>
}

export function useAppSeo(options: AppSeoOptions = {}) {
	const title = computed(() => formatPageTitle(toValue(options.title)))
	const description = computed(
		() => toValue(options.description) ?? SITE_DEFAULT_DESCRIPTION,
	)
	const robots = computed(() => toValue(options.robots))

	useSeoMeta({
		title,
		description,
		ogTitle: title,
		ogDescription: description,
		ogSiteName: SITE_NAME,
		ogType: 'website',
		ogLocale: 'de_DE',
		twitterCard: 'summary',
		twitterTitle: title,
		twitterDescription: description,
		robots,
	})
}
