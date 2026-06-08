import type { OptionalGroupChildPart, SentencePart, TemplateSet } from '~/types/template'

export type GenderVariantOption = {
	label: string
	value: [string, string]
}

export function genderVariantLabel(value: [string, string]): string {
	return `${value[0] ?? ''}/${value[1] ?? ''}`
}

export function genderVariantKey(value: [string, string]): string {
	return `${value[0]}\u0000${value[1]}`
}

function collectFromChildParts(parts: OptionalGroupChildPart[]): GenderVariantOption[] {
	const result: GenderVariantOption[] = []
	for (const part of parts) {
		if (part.type === 'genderVariant') {
			result.push({
				label: genderVariantLabel(part.value),
				value: part.value,
			})
		}
	}
	return result
}

export function collectGenderVariantsFromParts(parts: SentencePart[]): GenderVariantOption[] {
	const result: GenderVariantOption[] = []
	for (const part of parts) {
		if (part.type === 'genderVariant') {
			result.push({
				label: genderVariantLabel(part.value),
				value: part.value,
			})
		} else if (part.type === 'optionalGroup') {
			result.push(...collectFromChildParts(part.parts))
		}
	}
	return result
}

export function collectGenderVariantsFromTemplateSet(set: TemplateSet): GenderVariantOption[] {
	const result: GenderVariantOption[] = []
	for (const subject of set.subjects) {
		for (const category of subject.categories) {
			for (const grade of category.grades) {
				for (const variant of grade.variants) {
					result.push(...collectGenderVariantsFromParts(variant.sentences))
				}
			}
		}
	}
	return dedupeGenderVariants(result)
}

export function collectGenderVariantsFromTemplateSets(sets: TemplateSet[]): GenderVariantOption[] {
	const result: GenderVariantOption[] = []
	for (const set of sets) {
		result.push(...collectGenderVariantsFromTemplateSet(set))
	}
	return dedupeGenderVariants(result)
}

function dedupeGenderVariants(variants: GenderVariantOption[]): GenderVariantOption[] {
	const seen = new Set<string>()
	const result: GenderVariantOption[] = []
	for (const variant of variants) {
		const key = genderVariantKey(variant.value)
		if (seen.has(key)) continue
		seen.add(key)
		result.push(variant)
	}
	return result
}
