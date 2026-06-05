export type OptionalGroupChildPart =
	| { type: 'text'; value: string }
	| { type: 'genderVariant'; value: [string, string] }
	| { type: 'name'; value?: string }

export type SentencePart =
	| OptionalGroupChildPart
	| { type: 'optionalGroup'; id: string; enabledByDefault: boolean; parts: OptionalGroupChildPart[] }

export type SentencePartPath = {
	partIndex: number
	childIndex?: number
}

export interface Variant {
	id: string
	label: string
	sentences: SentencePart[]
}

export interface Grade {
	id: string
	label: string
	value?: number
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

export type TemplateClipboardKind = 'subject' | 'category' | 'grade' | 'variant' | 'sentencePart'

export type TemplateClipboardPayload =
	| {
		kind: 'subject'
		items: Subject[]
		copiedAt: number
		sourceLabel?: string
	}
	| {
		kind: 'category'
		items: Category[]
		copiedAt: number
		sourceLabel?: string
	}
	| {
		kind: 'grade'
		items: Grade[]
		copiedAt: number
		sourceLabel?: string
	}
	| {
		kind: 'variant'
		items: Variant[]
		copiedAt: number
		sourceLabel?: string
	}
	| {
		kind: 'sentencePart'
		items: SentencePart[]
		copiedAt: number
		sourceLabel?: string
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
