import { describe, expect, it } from 'vitest'
import {
	MAX_TEMPLATE_SETS_PER_SCHOOL,
	validateTemplateInput,
	validateTemplateSetLimit,
} from '../convex/lib/templateValidation'
import { migrateLegacyTemplateData } from '../convex/lib/templateMigration'

const templateId = '11111111-1111-4111-8111-111111111111'

function validTemplate() {
	return {
		id: templateId,
		label: 'Klasse 5',
		subjects: [
			{
				id: '22222222-2222-4222-8222-222222222222',
				label: 'Deutsch',
				categories: [
					{
						id: '33333333-3333-4333-8333-333333333333',
						label: 'Lesen',
						grades: [
							{
								id: '44444444-4444-4444-8444-444444444444',
								label: '1',
								value: 1,
								variants: [
									{
										id: '55555555-5555-4555-8555-555555555555',
										label: '1',
										sentences: [
											{ type: 'text' as const, value: 'Liest sicher.' },
											{ type: 'genderVariant' as const, value: ['Er', 'Sie'] },
											{
												type: 'optionalGroup' as const,
												id: '66666666-6666-4666-8666-666666666666',
												enabledByDefault: true,
												parts: [{ type: 'name' as const, value: 'Vorname' }],
											},
										],
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

describe('Convex template validation', () => {
	it('accepts a valid template payload', () => {
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data: validTemplate(),
		})).not.toThrow()
	})

	it('accepts optional hidden flags on template sets and subjects', () => {
		const data = validTemplate()
		data.hidden = true
		data.subjects[0].hidden = true
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data,
		})).not.toThrow()
	})

	it('requires the document id to match the template id', () => {
		const data = validTemplate()
		data.id = '77777777-7777-4777-8777-777777777777'
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data,
		})).toThrow(/must match templateId/)
	})

	it('rejects malformed gender variants', () => {
		const data = validTemplate()
		data.subjects[0].categories[0].grades[0].variants[0].sentences[1] = {
			type: 'genderVariant',
			value: ['Er'],
		}
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data,
		})).toThrow(/exactly two variants/)
	})

	it('rejects too many template sets', () => {
		expect(() => validateTemplateSetLimit(MAX_TEMPLATE_SETS_PER_SCHOOL + 1)).toThrow(/Too many/)
	})

	it('rejects duplicate ids in the template tree', () => {
		const data = validTemplate()
		data.subjects[0].categories[0].id = data.subjects[0].id
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data,
		})).toThrow(/unique/)
	})

	it('rejects invalid schema versions', () => {
		const data = validTemplate() as ReturnType<typeof validTemplate> & { _schemaVersion?: number }
		data._schemaVersion = 1.5
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data,
		})).toThrow(/_schemaVersion/)
	})

	it('migrates legacy optionalText and non-UUID template ids', () => {
		const migrated = migrateLegacyTemplateData({
			id: 'Klasse 5',
			label: 'Klasse 5',
			subjects: [
				{
					label: 'Deutsch',
					categories: [
						{
							label: 'Lesen',
							grades: [
								{
									label: '1',
									variants: [
										{
											label: '1',
											sentences: [
												{ type: 'optionalText', value: 'mit Zusatz' },
											],
										},
									],
								},
							],
						},
					],
				},
			],
		}, templateId, 'Klasse 5')

		expect(migrated).not.toBeNull()
		expect(migrated?.id).toBe(templateId)
		const part = migrated?.subjects[0].categories[0].grades[0].variants[0].sentences[0]
		expect(part?.type).toBe('optionalGroup')
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data: migrated!,
		})).not.toThrow()
	})

	it('migrates optionalText inside optionalGroup parts to plain text children', () => {
		const migrated = migrateLegacyTemplateData({
			id: templateId,
			label: 'Klasse 5',
			subjects: [
				{
					id: '22222222-2222-4222-8222-222222222222',
					label: 'Deutsch',
					categories: [
						{
							id: '33333333-3333-4333-8333-333333333333',
							label: 'Lesen',
							grades: [
								{
									id: '44444444-4444-4444-8444-444444444444',
									label: '1',
									variants: [
										{
											id: '55555555-5555-4555-8555-555555555555',
											label: '1',
											sentences: [
												{
													type: 'optionalGroup',
													id: '66666666-6666-4666-8666-666666666666',
													enabledByDefault: true,
													parts: [{ type: 'optionalText', value: 'alter Zusatz' }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		}, templateId, 'Klasse 5')

		const optionalGroup = migrated?.subjects[0].categories[0].grades[0].variants[0].sentences[0]
		expect(optionalGroup?.type).toBe('optionalGroup')
		if (optionalGroup?.type !== 'optionalGroup') throw new Error('Expected optional group')
		expect(optionalGroup.parts[0]).toEqual({ type: 'text', value: 'alter Zusatz' })
		expect(() => validateTemplateInput({
			templateId,
			label: 'Klasse 5',
			data: migrated!,
		})).not.toThrow()
	})

	it('repairs missing labels and malformed gender variants during legacy migration', () => {
		const migrated = migrateLegacyTemplateData({
			id: templateId,
			label: '',
			subjects: [
				{
					categories: [
						{
							grades: [
								{
									variants: [
										{
											sentences: [{ type: 'genderVariant', value: ['Er'] }],
										},
									],
								},
							],
						},
					],
				},
			],
		}, templateId, 'Fallback')

		expect(migrated?.label).toBe('Fallback')
		const part = migrated?.subjects[0].categories[0].grades[0].variants[0].sentences[0]
		expect(part).toEqual({ type: 'genderVariant', value: ['Er', ''] })
		expect(() => validateTemplateInput({
			templateId,
			label: 'Fallback',
			data: migrated!,
		})).not.toThrow()
	})
})
