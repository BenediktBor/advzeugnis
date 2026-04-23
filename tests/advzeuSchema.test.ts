import { describe, it, expect } from 'vitest'
import { AzSetExportPayloadSchema, AzSubjectExportPayloadSchema } from '~/schemas/template'

describe('AzSetExportPayloadSchema', () => {
	it('accepts a valid export payload', () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const subjectId = '22222222-2222-2222-2222-222222222222'
		const categoryId = '33333333-3333-3333-3333-333333333333'
		const gradeId = '44444444-4444-4444-4444-444444444444'
		const variantId = '55555555-5555-5555-5555-555555555555'

		const payload = {
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					subjects: [
						{
							id: subjectId,
							label: 'Mathe',
							categories: [
								{
									id: categoryId,
									label: 'Kategorie',
									grades: [
										{
											id: gradeId,
											label: '1',
											variants: [
												{
													id: variantId,
													label: '1',
													sentences: [{ type: 'text', value: 'gut gemacht' }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			},
		}

		const result = AzSetExportPayloadSchema.safeParse(payload)
		expect(result.success).toBe(true)
	})

	it('rejects wrong schemaVersion', () => {
		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 2,
			orderedIds: [],
			templateSets: {},
		})
		expect(result.success).toBe(false)
	})

	it('rejects non-uuid orderedIds', () => {
		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: ['not-uuid'],
			templateSets: {},
		})
		expect(result.success).toBe(false)
	})

	it('rejects nested invalid UUIDs (variant id)', () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const subjectId = '22222222-2222-2222-2222-222222222222'
		const categoryId = '33333333-3333-3333-3333-333333333333'
		const gradeId = '44444444-4444-4444-4444-444444444444'

		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					subjects: [
						{
							id: subjectId,
							label: 'Mathe',
							categories: [
								{
									id: categoryId,
									label: 'Kategorie',
									grades: [
										{
											id: gradeId,
											label: '1',
											variants: [
												{
													id: 'not-uuid',
													label: '1',
													sentences: [{ type: 'text', value: 'gut gemacht' }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			},
		})

		expect(result.success).toBe(false)
	})

	it('rejects sentence parts with missing text value', () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const categoryId = '33333333-3333-3333-3333-333333333333'
		const gradeId = '44444444-4444-4444-4444-444444444444'
		const subjectId = '22222222-2222-2222-2222-222222222222'
		const variantId = '55555555-5555-5555-5555-555555555555'

		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					subjects: [
						{
							id: subjectId,
							label: 'Mathe',
							categories: [
								{
									id: categoryId,
									label: 'Kategorie',
									grades: [
										{
											id: gradeId,
											label: '1',
											variants: [
												{
													id: variantId,
													label: '1',
													sentences: [{ type: 'text' }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			},
		})

		expect(result.success).toBe(false)
	})

	it('rejects genderVariant with wrong tuple shape', () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const subjectId = '22222222-2222-2222-2222-222222222222'
		const categoryId = '33333333-3333-3333-3333-333333333333'
		const gradeId = '44444444-4444-4444-4444-444444444444'
		const variantId = '55555555-5555-5555-5555-555555555555'

		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					subjects: [
						{
							id: subjectId,
							label: 'Mathe',
							categories: [
								{
									id: categoryId,
									label: 'Kategorie',
									grades: [
										{
											id: gradeId,
											label: '1',
											variants: [
												{
													id: variantId,
													label: '1',
													sentences: [{ type: 'genderVariant', value: ['Er'] }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			},
		})

		expect(result.success).toBe(false)
	})

	it('rejects name sentence part with wrong value type', () => {
		const setId = '11111111-1111-1111-1111-111111111111'
		const subjectId = '22222222-2222-2222-2222-222222222222'
		const categoryId = '33333333-3333-3333-3333-333333333333'
		const gradeId = '44444444-4444-4444-4444-444444444444'
		const variantId = '55555555-5555-5555-5555-555555555555'

		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					subjects: [
						{
							id: subjectId,
							label: 'Mathe',
							categories: [
								{
									id: categoryId,
									label: 'Kategorie',
									grades: [
										{
											id: gradeId,
											label: '1',
											variants: [
												{
													id: variantId,
													label: '1',
													sentences: [{ type: 'name', value: 123 }],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			},
		})

		expect(result.success).toBe(false)
	})

	it('rejects missing required TemplateSet fields (subjects missing)', () => {
		const setId = '11111111-1111-1111-1111-111111111111'

		const result = AzSetExportPayloadSchema.safeParse({
			schemaVersion: 1,
			orderedIds: [setId],
			templateSets: {
				[setId]: {
					id: setId,
					label: 'Klasse 1',
					// missing `subjects`
				},
			},
		})

		expect(result.success).toBe(false)
	})
})

describe('AzSubjectExportPayloadSchema', () => {
	it('accepts a valid subject export payload', () => {
		const payload = {
			schemaVersion: 1,
			subject: {
				id: '22222222-2222-2222-2222-222222222222',
				label: 'Mathe',
				categories: [
					{
						id: '33333333-3333-3333-3333-333333333333',
						label: 'Kategorie',
						grades: [
							{
								id: '44444444-4444-4444-4444-444444444444',
								label: '1',
								variants: [
									{
										id: '55555555-5555-5555-5555-555555555555',
										label: '1',
										sentences: [{ type: 'text', value: 'gut gemacht' }],
									},
								],
							},
						],
					},
				],
			},
		}

		const result = AzSubjectExportPayloadSchema.safeParse(payload)
		expect(result.success).toBe(true)
	})

	it('rejects invalid subject payloads', () => {
		const result = AzSubjectExportPayloadSchema.safeParse({
			schemaVersion: 1,
			subject: {
				id: 'not-uuid',
				label: 'Mathe',
				categories: [],
			},
		})

		expect(result.success).toBe(false)
	})
})

