export type SentencePart =
	| { type: 'text'; value: string }
	| { type: 'genderVariant'; value: [string, string] }
	| { type: 'name'; value?: string }
	| { type: 'optionalText'; id: string; value: string; enabledByDefault: boolean }

export interface Variant {
	id: string
	label: string
	sentences: SentencePart[]
}

export interface Grade {
	id: string
	label: string
	variants: Variant[]
}

export interface Category {
	id: string
	label: string
	grades: Grade[]
}

export interface Subject {
	id: string
	label: string
	categories: Category[]
}

export interface TemplateSet {
	id: string
	label: string
	subjects: Subject[]
}

/** URL-safe slug for a template set (e.g. "Klasse 1" -> "Klasse-1"). */
export const TEMPLATE_SET_SLUGS = [
	'Klasse-1',
	'Klasse-2',
	'Klasse-3',
	'Klasse-4',
] as const
export type TemplateSetSlug = (typeof TEMPLATE_SET_SLUGS)[number]

/** Labels for display (e.g. "Klasse 1"). */
export const TEMPLATE_SET_LABELS = [
	'Klasse 1',
	'Klasse 2',
	'Klasse 3',
	'Klasse 4',
] as const

export function slugToLabel(slug: string): string {
	const index = TEMPLATE_SET_SLUGS.indexOf(slug as TemplateSetSlug)
	return index >= 0 ? (TEMPLATE_SET_LABELS[index] as string) : slug.replace(/-/g, ' ')
}

export function labelToSlug(label: string): string {
	const index = TEMPLATE_SET_LABELS.indexOf(
		label as (typeof TEMPLATE_SET_LABELS)[number],
	)
	return index >= 0
		? (TEMPLATE_SET_SLUGS[index] as string)
		: label.replace(/\s+/g, '-').trim()
}
