import { describe, it, expect } from 'vitest'
import {
	buildVariantPreviewText,
	buildVariantsPreviewText,
	buildGradeAverageSummary,
	buildDeactivatedReportSelection,
	buildReportTextCoverageSummary,
	buildSelectionCoverageSummary,
	buildReportSegments,
	buildReportPlainText,
	ensureVariantIdsForGrade,
	getDefaultVariantIdsForGrade,
	getEffectiveCategoryEntry,
	namePartOverrideKey,
	normalizeVariantIdsForGrade,
	resolveGenderVariantValue,
	resolveNamePartReplacement,
} from '~/utils/reportText'
import type { Student } from '~/types/student'
import type { Category, TemplateSet } from '~/types/template'

function makeStudent(overrides: Partial<Student> = {}): Student {
	return {
		id: 'student-1',
		name: 'Max',
		surname: 'Müller',
		gender: 'male',
		templateSetId: 'set-1',
		...overrides,
	}
}

function makeSelectedStudent(
	categoryId = 'cat-1',
	gradeId: string | null = 'grade-1',
	variantIds: string[] = ['variant-1'],
	overrides: Partial<Student> = {}
): Student {
	return makeStudent({
		...overrides,
		reportSelection: {
			...overrides.reportSelection,
			categories: {
				[categoryId]: { gradeId, variantIds },
				...overrides.reportSelection?.categories,
			},
		},
	})
}

function makeCategory(overrides: Partial<Category> = {}): Category {
	return {
		id: 'cat-1',
		label: 'Kategorie',
		grades: [
			{
				id: 'grade-1',
				label: '1',
				variants: [
					{
						id: 'variant-1',
						label: '1',
						sentences: [{ type: 'text', value: 'gut gemacht' }],
					},
				],
			},
		],
		...overrides,
	}
}

function makeTemplateSet(): TemplateSet {
	return {
		id: 'set-1',
		label: 'Klasse 1',
		subjects: [
			{
				id: 'subj-1',
				label: 'Mathe',
				categories: [makeCategory()],
			},
		],
	}
}

describe('getEffectiveCategoryEntry', () => {
	it('returns null when a category has no stored selection', () => {
		const student = makeStudent()
		const category = makeCategory()
		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry).toBeNull()
	})

	it('returns null when no grades exist', () => {
		const student = makeStudent()
		const category = makeCategory({ grades: [] })
		expect(getEffectiveCategoryEntry(student, category)).toBeNull()
	})

	it('returns null when gradeId is explicitly null (excluded)', () => {
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: null, variantIds: [] },
				},
			},
		})
		const category = makeCategory()
		expect(getEffectiveCategoryEntry(student, category)).toBeNull()
	})

	it('uses the stored gradeId when provided', () => {
		const category = makeCategory({
			grades: [
				{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [] }] },
				{ id: 'g2', label: '2', variants: [{ id: 'v2', label: '1', sentences: [] }] },
			],
		})
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: 'g2', variantIds: ['v2'] },
				},
			},
		})
		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry).toEqual({ gradeId: 'g2', variantIds: ['v2'] })
	})

	it('ignores selectedSubjectId when resolving category entries', () => {
		const category = makeCategory({
			grades: [
				{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [] }] },
				{ id: 'g2', label: '2', variants: [{ id: 'v2', label: '1', sentences: [] }] },
			],
		})
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: 'g2', variantIds: ['v2'] },
				},
				selectedSubjectId: 'subject-2',
			},
		})
		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry).toEqual({ gradeId: 'g2', variantIds: ['v2'] })
	})

	it('auto-selects single variant', () => {
		const student = makeSelectedStudent('cat-1', 'grade-1', [])
		const category = makeCategory()
		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry?.variantIds).toEqual(['variant-1'])
	})

	it('defaults multi-variant grades to the first variant', () => {
		const student = makeSelectedStudent('cat-1', 'g1', [])
		const category = makeCategory({
			grades: [
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] },
						{ id: 'v2', label: '2', sentences: [{ type: 'text', value: 'B.' }] },
					],
				},
			],
		})

		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry).toEqual({ gradeId: 'g1', variantIds: ['v1'] })
	})

	it('filters out invalid variant IDs', () => {
		const category = makeCategory({
			grades: [
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [] },
						{ id: 'v2', label: '2', sentences: [] },
					],
				},
			],
		})
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: 'g1', variantIds: ['v1', 'invalid-id'] },
				},
			},
		})
		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry?.variantIds).toEqual(['v1'])
	})

	it('returns null when gradeId is non-null but invalid', () => {
		const category: Category = {
			id: 'cat-1',
			label: 'Kategorie',
			grades: [
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [] },
						{ id: 'v2', label: '2', sentences: [] },
					],
				},
			],
		}

		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: 'invalid-grade', variantIds: ['invalid-variant'] },
				},
			},
		})

		const entry = getEffectiveCategoryEntry(student, category)
		expect(entry).toBeNull()
	})

	it('falls back to the default variant when a grade is explicitly selected without variants', () => {
		const category = makeCategory({
			grades: [
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [] },
						{ id: 'v2', label: '2', sentences: [] },
					],
				},
			],
		})
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: 'g1', variantIds: [] },
				},
			},
		})

		expect(getEffectiveCategoryEntry(student, category)).toEqual({
			gradeId: 'g1',
			variantIds: ['v1'],
		})
	})
})

describe('buildReportSegments', () => {
	it('builds segments from student and template set', () => {
		const student = makeSelectedStudent()
		const templateSet = makeTemplateSet()
		const segments = buildReportSegments(student, templateSet)
		expect(segments).toHaveLength(1)
		expect(segments[0]).toEqual({
			categoryId: 'cat-1',
			gradeId: 'grade-1',
			variantId: 'variant-1',
			text: 'gut gemacht.',
		})
	})

	it('returns empty for student with excluded category', () => {
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: null, variantIds: [] },
				},
			},
		})
		const templateSet = makeTemplateSet()
		expect(buildReportSegments(student, templateSet)).toHaveLength(0)
	})

	it('resolves gender variants for male', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'genderVariant', value: ['Er', 'Sie'] },
												{ type: 'text', value: 'arbeitet gut.' },
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
		const student = makeSelectedStudent('c1', 'g1', ['v1'], { gender: 'male' })
		const segments = buildReportSegments(student, templateSet)
		expect(segments[0]?.text).toBe('Er arbeitet gut.')
	})

	it('resolves name placeholder', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-2',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'name' },
												{ type: 'text', value: 'ist fleißig.' },
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
		const student = makeSelectedStudent('c1', 'g1', ['v1'], { name: 'Lisa' })
		const segments = buildReportSegments(student, templateSet)
		expect(segments[0]?.text).toBe('Lisa ist fleißig.')
	})

	it('resolves name override when `name.value` is provided', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-3',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'name', value: 'Lisa Override' },
												{ type: 'text', value: 'ist fleißig.' },
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
		const student = makeSelectedStudent('c1', 'g1', ['v1'], { name: 'Max' })
		const segments = buildReportSegments(student, templateSet)
		expect(segments[0]?.text).toBe('Lisa Override ist fleißig.')
	})

	it('resolves gender variants for female', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-4',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'genderVariant', value: ['Er', 'Sie'] },
												{ type: 'text', value: 'arbeitet gut.' },
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
		const student = makeSelectedStudent('c1', 'g1', ['v1'], { gender: 'female' })
		const segments = buildReportSegments(student, templateSet)
		expect(segments[0]?.text).toBe('Sie arbeitet gut.')
	})

	it('filters whitespace-only sentence parts', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-5',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'text', value: '   ' },
												{ type: 'name' },
												{ type: 'text', value: 'ist fleißig.' },
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
		const student = makeSelectedStudent('c1', 'g1', ['v1'], { name: 'Lisa' })
		const segments = buildReportSegments(student, templateSet)
		expect(segments[0]?.text).toBe('Lisa ist fleißig.')
	})

	it('skips a variant when all sentence parts resolve to empty', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-6',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'text', value: '   ' },
												{ type: 'name', value: '   ' },
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
		const student = makeStudent({ name: 'Lisa' })
		expect(buildReportSegments(student, templateSet)).toHaveLength(0)
	})

	it('falls back to the default variant when stored variant selection becomes invalid', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-7',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] },
										{ id: 'v2', label: '2', sentences: [{ type: 'text', value: 'B.' }] },
									],
								},
							],
						},
					],
				},
			],
		}

		const student = makeStudent({
			name: 'Lisa',
			reportSelection: {
				categories: {},
			},
		})

		// Note: category id differs from reportSelection key, so override it to 'c1'.
		student.reportSelection = {
			categories: {
				c1: { gradeId: 'g1', variantIds: ['invalid-variant'] },
			},
		}

		expect(buildReportSegments(student, templateSet)).toEqual([
			{ categoryId: 'c1', gradeId: 'g1', variantId: 'v1', text: 'A.' },
		])
	})

	it('creates one segment per selected variant in the same category', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-9',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C1',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] },
										{ id: 'v2', label: '2', sentences: [{ type: 'text', value: 'B.' }] },
									],
								},
							],
						},
					],
				},
			],
		}
		const student = makeStudent({
			reportSelection: {
				categories: {
					c1: { gradeId: 'g1', variantIds: ['v1', 'v2'] },
				},
			},
		})

		const segments = buildReportSegments(student, templateSet)
		expect(segments).toHaveLength(2)
		expect(segments.map((segment) => segment.text)).toEqual(['A.', 'B.'])
	})

	it('applies persisted name part overrides when building report text', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-10',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{
											id: 'v1',
											label: '1',
											sentences: [
												{ type: 'name' },
												{ type: 'text', value: 'arbeitet gut.' },
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
		const student = makeStudent({
			gender: 'female',
			reportSelection: {
				categories: {
					c1: {
						gradeId: 'g1',
						variantIds: ['v1'],
						namePartOverrides: { [namePartOverrideKey('v1', 0)]: 'erSie' },
					},
				},
			},
		})

		expect(buildReportSegments(student, templateSet)[0]?.text).toBe('Sie arbeitet gut.')
		expect(buildReportPlainText(student, templateSet)).toBe('Sie arbeitet gut.')
	})
})

describe('buildReportPlainText', () => {
	it('concatenates all segment texts', () => {
		const student = makeSelectedStudent()
		const templateSet = makeTemplateSet()
		const text = buildReportPlainText(student, templateSet)
		expect(text).toBe('gut gemacht.')
	})

	it('concatenates multiple segments with single spaces', () => {
		const templateSet: TemplateSet = {
			id: 'set-test-8',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						{
							id: 'c1',
							label: 'C1',
							grades: [
								{
									id: 'g1',
									label: '1',
									variants: [
										{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] },
									],
								},
							],
						},
						{
							id: 'c2',
							label: 'C2',
							grades: [
								{
									id: 'g2',
									label: '1',
									variants: [
										{ id: 'v2', label: '2', sentences: [{ type: 'text', value: 'B.' }] },
									],
								},
							],
						},
					],
				},
			],
		}

		const student = makeStudent({
			reportSelection: {
				categories: {
					c1: { gradeId: 'g1', variantIds: ['v1'] },
					c2: { gradeId: 'g2', variantIds: ['v2'] },
				},
			},
		})
		const text = buildReportPlainText(student, templateSet)
		expect(text).toBe('A. B.')
	})
})

describe('grade average summary', () => {
	it('calculates the average from numeric grade labels', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [] }] },
								{ id: 'g2', label: '2', variants: [{ id: 'v2', label: '1', sentences: [] }] },
							],
						}),
						makeCategory({
							id: 'c2',
							grades: [
								{ id: 'g3', label: '3', variants: [{ id: 'v3', label: '1', sentences: [] }] },
							],
						}),
					],
				},
			],
		}
		const student = makeStudent({
			reportSelection: {
				categories: {
					c1: { gradeId: 'g2', variantIds: ['v2'] },
					c2: { gradeId: 'g3', variantIds: ['v3'] },
				},
			},
		})

		const summary = buildGradeAverageSummary(student, templateSet)
		expect(summary?.average).toBe(2.5)
		expect(summary?.count).toBe(2)
	})

	it('uses an optional grade value before the label and supports comma decimals', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '6', value: 1.5, variants: [{ id: 'v1', label: '1', sentences: [] }] },
							],
						}),
						makeCategory({
							id: 'c2',
							grades: [
								{ id: 'g2', label: '2,5', variants: [{ id: 'v2', label: '1', sentences: [] }] },
							],
						}),
					],
				},
			],
		}

		const summary = buildGradeAverageSummary(
			makeStudent({
				reportSelection: {
					categories: {
						c1: { gradeId: 'g1', variantIds: ['v1'] },
						c2: { gradeId: 'g2', variantIds: ['v2'] },
					},
				},
			}),
			templateSet
		)
		expect(summary?.average).toBe(2)
		expect(summary?.minGrade).toBe(1.5)
		expect(summary?.maxGrade).toBe(2.5)
	})

	it('ignores excluded and non-numeric grades', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [] }] },
							],
						}),
						makeCategory({
							id: 'c2',
							grades: [
								{ id: 'g2', label: 'gut', variants: [{ id: 'v2', label: '1', sentences: [] }] },
							],
						}),
						makeCategory({
							id: 'c3',
							grades: [
								{ id: 'g3', label: '3', variants: [{ id: 'v3', label: '1', sentences: [] }] },
							],
						}),
					],
				},
			],
		}
		const student = makeStudent({
			reportSelection: {
				categories: {
					c1: { gradeId: 'g1', variantIds: ['v1'] },
					c2: { gradeId: 'g2', variantIds: ['v2'] },
					c3: { gradeId: null, variantIds: [] },
				},
			},
		})

		const summary = buildGradeAverageSummary(student, templateSet)
		expect(summary?.average).toBe(1)
		expect(summary?.count).toBe(1)
	})

	it('normalizes progress so lower averages fill more of the circle', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [] }] },
								{ id: 'g2', label: '6', variants: [{ id: 'v2', label: '1', sentences: [] }] },
							],
						}),
					],
				},
			],
		}
		const student = makeStudent({
			reportSelection: {
				categories: {
					c1: { gradeId: 'g2', variantIds: ['v2'] },
				},
			},
		})

		expect(buildGradeAverageSummary(makeSelectedStudent('c1', 'g1', ['v1']), templateSet)?.progress).toBe(1)
		expect(buildGradeAverageSummary(student, templateSet)?.progress).toBe(0)
	})

	it('returns null when no selected grade has a numeric value', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: 'gut', variants: [{ id: 'v1', label: '1', sentences: [] }] },
							],
						}),
					],
				},
			],
		}

		expect(buildGradeAverageSummary(makeStudent(), templateSet)).toBeNull()
	})
})

describe('report text coverage summary', () => {
	it('counts categories that contribute generated text', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] }] },
							],
						}),
						makeCategory({
							id: 'c2',
							grades: [
								{ id: 'g2', label: '2', variants: [{ id: 'v2', label: '1', sentences: [{ type: 'text', value: '   ' }] }] },
							],
						}),
					],
				},
			],
		}

		const summary = buildReportTextCoverageSummary(
			makeStudent({
				reportSelection: {
					categories: {
						c1: { gradeId: 'g1', variantIds: ['v1'] },
						c2: { gradeId: 'g2', variantIds: ['v2'] },
					},
				},
			}),
			templateSet
		)
		expect(summary).toEqual({
			completed: 1,
			total: 2,
			progress: 0.5,
			isFinished: false,
		})
	})

	it('marks a student as finished only when every category contributes text', () => {
		const templateSet = makeTemplateSet()
		expect(buildReportTextCoverageSummary(makeSelectedStudent(), templateSet)).toEqual({
			completed: 1,
			total: 1,
			progress: 1,
			isFinished: true,
		})
	})

	it('does not mark empty template sets as finished', () => {
		const templateSet: TemplateSet = { id: 'set-1', label: 'Empty', subjects: [] }
		expect(buildReportTextCoverageSummary(makeStudent(), templateSet)).toEqual({
			completed: 0,
			total: 0,
			progress: 0,
			isFinished: false,
		})
	})
})

describe('selection coverage summary', () => {
	it('matches the edit page Auswahl logic by counting effective selected categories', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S',
					categories: [
						makeCategory({
							id: 'c1',
							grades: [
								{ id: 'g1', label: '1', variants: [{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] }] },
							],
						}),
						makeCategory({
							id: 'c2',
							grades: [
								{ id: 'g2', label: '2', variants: [{ id: 'v2', label: '1', sentences: [{ type: 'text', value: '   ' }] }] },
							],
						}),
					],
				},
			],
		}

		expect(buildSelectionCoverageSummary(
			makeStudent({
				reportSelection: {
					categories: {
						c1: { gradeId: 'g1', variantIds: ['v1'] },
						c2: { gradeId: 'g2', variantIds: ['v2'] },
					},
				},
			}),
			templateSet
		)).toEqual({
			completed: 2,
			total: 2,
			progress: 1,
			isFinished: true,
		})
	})

	it('does not count explicitly disabled categories', () => {
		const templateSet = makeTemplateSet()
		const student = makeStudent({
			reportSelection: {
				categories: {
					'cat-1': { gradeId: null, variantIds: [] },
				},
			},
		})

		expect(buildSelectionCoverageSummary(student, templateSet)).toEqual({
			completed: 0,
			total: 1,
			progress: 0,
			isFinished: false,
		})
	})
})

describe('deactivated report selection', () => {
	it('creates a disabled entry for every category in a template set', () => {
		const templateSet: TemplateSet = {
			id: 'set-1',
			label: 'Test',
			subjects: [
				{
					id: 's1',
					label: 'S1',
					categories: [makeCategory({ id: 'c1' })],
				},
				{
					id: 's2',
					label: 'S2',
					categories: [makeCategory({ id: 'c2' })],
				},
			],
		}

		expect(buildDeactivatedReportSelection(templateSet)).toEqual({
			categories: {
				c1: { gradeId: null, variantIds: [] },
				c2: { gradeId: null, variantIds: [] },
			},
		})
	})
})

describe('preview helpers', () => {
	it('builds a preview for an individual variant', () => {
		const student = makeStudent({ name: 'Lisa', gender: 'female' })
		const text = buildVariantPreviewText(student, {
			id: 'v1',
			label: '1',
			sentences: [
				{ type: 'genderVariant', value: ['Er', 'Sie'] },
				{ type: 'name' },
				{ type: 'text', value: 'arbeitet konzentriert.' },
			],
		})

		expect(text).toBe('Sie Lisa arbeitet konzentriert.')
	})

	it('joins multiple selected variant previews with spaces', () => {
		const student = makeStudent({ name: 'Lisa' })
		const text = buildVariantsPreviewText(student, [
			{ id: 'v1', label: '1', sentences: [{ type: 'text', value: 'A.' }] },
			{ id: 'v2', label: '2', sentences: [{ type: 'text', value: 'B.' }] },
		])

		expect(text).toBe('A. B.')
	})

	it('renders optional text when enabled by default', () => {
		const student = makeStudent()
		const text = buildVariantPreviewText(student, {
			id: 'v1',
			label: '1',
			sentences: [
				{
					type: 'optionalText',
					id: 'optional-1',
					value: 'arbeitet besonders sorgfältig',
					enabledByDefault: true,
				},
			],
		})

		expect(text).toBe('arbeitet besonders sorgfältig.')
	})

	it('omits optional text when a student override disables it', () => {
		const student = makeStudent()
		const text = buildVariantPreviewText(
			student,
			{
				id: 'v1',
				label: '1',
				sentences: [
					{ type: 'name' },
					{
						type: 'optionalText',
						id: 'optional-1',
						value: 'arbeitet besonders sorgfältig',
						enabledByDefault: true,
					},
					{ type: 'text', value: 'lernt weiter' },
				],
			},
			{ 'optional-1': false }
		)

		expect(text).toBe('Max lernt weiter.')
	})

	it('renders optional text when a student override enables it', () => {
		const student = makeStudent()
		const text = buildVariantPreviewText(
			student,
			{
				id: 'v1',
				label: '1',
				sentences: [
					{
						type: 'optionalText',
						id: 'optional-1',
						value: 'arbeitet besonders sorgfältig',
						enabledByDefault: false,
					},
				],
			},
			{ 'optional-1': true }
		)

		expect(text).toBe('arbeitet besonders sorgfältig.')
	})

	it('preserves existing final punctuation', () => {
		const student = makeStudent()
		const variants = [
			{ id: 'v1', label: '1', sentences: [{ type: 'text' as const, value: 'Sehr gut!' }] },
			{ id: 'v2', label: '2', sentences: [{ type: 'text' as const, value: 'Wirklich?' }] },
		]

		expect(buildVariantsPreviewText(student, variants)).toBe('Sehr gut! Wirklich?')
	})

	it('keeps name parts unchanged without name overrides', () => {
		const student = makeStudent({ name: 'Lisa', gender: 'female' })
		const text = buildVariantPreviewText(student, {
			id: 'v1',
			label: '1',
			sentences: [
				{ type: 'name' },
				{ type: 'text', value: 'arbeitet konzentriert.' },
			],
		})

		expect(text).toBe('Lisa arbeitet konzentriert.')
	})

	it('replaces a sentence-start name with the uppercase gendered replacement', () => {
		const student = makeStudent({ name: 'Lisa', gender: 'female' })
		const variant = {
			id: 'v1',
			label: '1',
			sentences: [
				{ type: 'name' as const },
				{ type: 'text' as const, value: 'arbeitet konzentriert.' },
			],
		}

		const text = buildVariantPreviewText(student, variant, {}, {
			[namePartOverrideKey('v1', 0)]: 'erSie',
		})

		expect(text).toBe('Sie arbeitet konzentriert.')
	})

	it('replaces an in-sentence name with the lowercase gendered replacement', () => {
		const student = makeStudent({ name: 'Max', gender: 'male' })
		const variant = {
			id: 'v1',
			label: '1',
			sentences: [
				{ type: 'text' as const, value: 'Heute zeigt' },
				{ type: 'name' as const },
				{ type: 'text' as const, value: 'viel Ausdauer.' },
			],
		}

		const text = buildVariantPreviewText(student, variant, {}, {
			[namePartOverrideKey('v1', 1)]: 'erSie',
		})

		expect(text).toBe('Heute zeigt er viel Ausdauer.')
	})

	it('treats a name after sentence punctuation as sentence-start', () => {
		const student = makeStudent({ name: 'Max', gender: 'male' })
		const variant = {
			id: 'v1',
			label: '1',
			sentences: [
				{ type: 'text' as const, value: 'Heute klappt es.' },
				{ type: 'name' as const },
				{ type: 'text' as const, value: 'meldet sich zuverlässig.' },
			],
		}

		const text = buildVariantPreviewText(student, variant, {}, {
			[namePartOverrideKey('v1', 1)]: 'erSie',
		})

		expect(text).toBe('Heute klappt es. Er meldet sich zuverlässig.')
	})

	it('uses the same gender tuple behavior for name replacements and gender variants', () => {
		expect(resolveNamePartReplacement('erSie', 'female', true)).toBe(
			resolveGenderVariantValue(['Er', 'Sie'], 'female')
		)
		expect(resolveNamePartReplacement('erSie', 'male', false)).toBe(
			resolveGenderVariantValue(['er', 'sie'], 'male')
		)
	})
})

describe('selection helpers', () => {
	it('returns the first variant as the default for a grade', () => {
		expect(
			getDefaultVariantIdsForGrade({
				id: 'g1',
				label: '1',
				variants: [
					{ id: 'v1', label: '1', sentences: [] },
					{ id: 'v2', label: '2', sentences: [] },
				],
			})
		).toEqual(['v1'])
	})

	it('normalizes variant IDs to grade order and removes invalid IDs', () => {
		expect(
			normalizeVariantIdsForGrade(
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [] },
						{ id: 'v2', label: '2', sentences: [] },
						{ id: 'v3', label: '3', sentences: [] },
					],
				},
				['v3', 'invalid', 'v1']
			)
		).toEqual(['v1', 'v3'])
	})

	it('falls back to the default variant when normalization yields no matches', () => {
		expect(
			ensureVariantIdsForGrade(
				{
					id: 'g1',
					label: '1',
					variants: [
						{ id: 'v1', label: '1', sentences: [] },
						{ id: 'v2', label: '2', sentences: [] },
					],
				},
				['invalid']
			)
		).toEqual(['v1'])
	})
})
