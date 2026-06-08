import { describe, expect, it } from 'vitest'
import type { SentencePart, TemplateSet } from '~/types/template'
import {
	collectGenderVariantsFromParts,
	collectGenderVariantsFromTemplateSet,
	collectGenderVariantsFromTemplateSets,
	genderVariantKey,
	genderVariantLabel,
} from '~/utils/collectGenderVariants'

describe('genderVariantLabel', () => {
	it('formats male and female forms', () => {
		expect(genderVariantLabel(['Er', 'Sie'])).toBe('Er/Sie')
	})
})

describe('genderVariantKey', () => {
	it('produces stable keys for deduplication', () => {
		expect(genderVariantKey(['Er', 'Sie'])).toBe('Er\u0000Sie')
	})
})

describe('collectGenderVariantsFromParts', () => {
	it('collects top-level gender variants', () => {
		const parts: SentencePart[] = [
			{ type: 'text', value: 'Hello' },
			{ type: 'genderVariant', value: ['Er', 'Sie'] },
		]
		expect(collectGenderVariantsFromParts(parts)).toEqual([
			{ label: 'Er/Sie', value: ['Er', 'Sie'] },
		])
	})

	it('collects gender variants inside optional groups', () => {
		const parts: SentencePart[] = [
			{
				type: 'optionalGroup',
				id: 'group-1',
				enabledByDefault: true,
				parts: [
					{ type: 'genderVariant', value: ['ihn', 'sie'] },
					{ type: 'text', value: 'extra' },
				],
			},
		]
		expect(collectGenderVariantsFromParts(parts)).toEqual([
			{ label: 'ihn/sie', value: ['ihn', 'sie'] },
		])
	})

	it('deduplicates within the same parts list', () => {
		const parts: SentencePart[] = [
			{ type: 'genderVariant', value: ['Er', 'Sie'] },
			{ type: 'genderVariant', value: ['Er', 'Sie'] },
		]
		const result = collectGenderVariantsFromParts(parts)
		expect(result).toHaveLength(2)
	})
})

function makeTemplateSet(sentences: SentencePart[]): TemplateSet {
	return {
		id: 'set-1',
		label: 'Test',
		subjects: [
			{
				id: 'subject-1',
				label: 'Deutsch',
				categories: [
					{
						id: 'category-1',
						label: 'Lesen',
						grades: [
							{
								id: 'grade-1',
								label: '1',
								variants: [
									{
										id: 'variant-1',
										label: 'A',
										sentences,
									},
								],
							},
						],
					},
				],
			},
		],
	}
}

describe('collectGenderVariantsFromTemplateSet', () => {
	it('deduplicates across variants in the same set', () => {
		const set: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 'subject-1',
					label: 'Deutsch',
					categories: [
						{
							id: 'category-1',
							label: 'Lesen',
							grades: [
								{
									id: 'grade-1',
									label: '1',
									variants: [
										{
											id: 'variant-1',
											label: 'A',
											sentences: [{ type: 'genderVariant', value: ['Er', 'Sie'] }],
										},
										{
											id: 'variant-2',
											label: 'B',
											sentences: [{ type: 'genderVariant', value: ['Er', 'Sie'] }],
										},
									],
								},
							],
						},
					],
				},
			],
		}
		expect(collectGenderVariantsFromTemplateSet(set)).toEqual([
			{ label: 'Er/Sie', value: ['Er', 'Sie'] },
		])
	})
})

describe('collectGenderVariantsFromTemplateSets', () => {
	it('merges variants from multiple sets preserving first-seen order', () => {
		const setA = makeTemplateSet([{ type: 'genderVariant', value: ['Er', 'Sie'] }])
		const setB = makeTemplateSet([{ type: 'genderVariant', value: ['ihn', 'sie'] }])
		const setC = makeTemplateSet([{ type: 'genderVariant', value: ['Er', 'Sie'] }])
		expect(collectGenderVariantsFromTemplateSets([setA, setB, setC])).toEqual([
			{ label: 'Er/Sie', value: ['Er', 'Sie'] },
			{ label: 'ihn/sie', value: ['ihn', 'sie'] },
		])
	})
})
