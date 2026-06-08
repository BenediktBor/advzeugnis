import { randomId } from '~/utils/randomId'
import type {
	Category,
	Grade,
	SentencePart,
	Subject,
	TemplateClipboardPayload,
	Variant,
} from '~/types/template'

function clonePlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T
}

export function cloneSentencePartWithFreshIds(part: SentencePart): SentencePart {
	const cloned = clonePlain(part)
	if (cloned.type === 'optionalGroup') {
		return {
			...cloned,
			id: randomId(),
		}
	}
	return cloned
}

export function cloneVariantWithFreshIds(variant: Variant): Variant {
	return {
		...clonePlain(variant),
		id: randomId(),
		sentences: variant.sentences.map(cloneSentencePartWithFreshIds),
	}
}

export function cloneGradeWithFreshIds(grade: Grade): Grade {
	return {
		...clonePlain(grade),
		id: randomId(),
		variants: grade.variants.map(cloneVariantWithFreshIds),
	}
}

export function cloneCategoryWithFreshIds(category: Category): Category {
	return {
		...clonePlain(category),
		id: randomId(),
		grades: category.grades.map(cloneGradeWithFreshIds),
	}
}

export function cloneSubjectWithFreshIds(subject: Subject): Subject {
	return {
		...clonePlain(subject),
		id: randomId(),
		categories: subject.categories.map(cloneCategoryWithFreshIds),
	}
}

export function cloneClipboardItemsForPaste(payload: TemplateClipboardPayload): TemplateClipboardPayload['items'] {
	if (payload.kind === 'subject') return payload.items.map(cloneSubjectWithFreshIds)
	if (payload.kind === 'category') return payload.items.map(cloneCategoryWithFreshIds)
	if (payload.kind === 'grade') return payload.items.map(cloneGradeWithFreshIds)
	if (payload.kind === 'variant') return payload.items.map(cloneVariantWithFreshIds)
	return payload.items.map(cloneSentencePartWithFreshIds)
}

export function createTemplateClipboardPayload(
	kind: 'subject',
	items: Subject[],
	sourceLabel?: string,
): TemplateClipboardPayload
export function createTemplateClipboardPayload(
	kind: 'category',
	items: Category[],
	sourceLabel?: string,
): TemplateClipboardPayload
export function createTemplateClipboardPayload(
	kind: 'grade',
	items: Grade[],
	sourceLabel?: string,
): TemplateClipboardPayload
export function createTemplateClipboardPayload(
	kind: 'variant',
	items: Variant[],
	sourceLabel?: string,
): TemplateClipboardPayload
export function createTemplateClipboardPayload(
	kind: 'sentencePart',
	items: SentencePart[],
	sourceLabel?: string,
): TemplateClipboardPayload
export function createTemplateClipboardPayload(
	kind: TemplateClipboardPayload['kind'],
	items: Array<Subject | Category | Grade | Variant | SentencePart>,
	sourceLabel?: string,
): TemplateClipboardPayload {
	const copiedAt = Date.now()
	const base = sourceLabel ? { copiedAt, sourceLabel } : { copiedAt }

	if (kind === 'subject') {
		return {
			kind,
			items: (items as Subject[]).map(cloneSubjectWithFreshIds),
			...base,
		}
	}
	if (kind === 'category') {
		return {
			kind,
			items: (items as Category[]).map(cloneCategoryWithFreshIds),
			...base,
		}
	}
	if (kind === 'grade') {
		return {
			kind,
			items: (items as Grade[]).map(cloneGradeWithFreshIds),
			...base,
		}
	}
	if (kind === 'variant') {
		return {
			kind,
			items: (items as Variant[]).map(cloneVariantWithFreshIds),
			...base,
		}
	}
	return {
		kind,
		items: (items as SentencePart[]).map(cloneSentencePartWithFreshIds),
		...base,
	}
}
