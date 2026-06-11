import { describe, expect, it } from 'vitest'
import {
	buildReportPlainText,
	buildReportSegments,
	buildSelectionCoverageSummary,
} from '~/utils/reportText'
import {
	canSeeHiddenTemplates,
	filterTemplateSetForRole,
	getVisibleSubjects,
	summarizeVisibleTemplateSet,
} from '~/utils/templateVisibility'
import type { Student } from '~/types/student'
import type { TemplateSet } from '~/types/template'

const templateSetId = '11111111-1111-4111-8111-111111111111'
const visibleSubjectId = '22222222-2222-4222-8222-222222222222'
const hiddenSubjectId = '33333333-3333-4333-8333-333333333333'
const categoryId = '44444444-4444-4444-8444-444444444444'
const gradeId = '55555555-5555-4555-8555-555555555555'
const variantId = '66666666-6666-4666-8666-666666666666'

function buildTemplateSet(overrides: Partial<TemplateSet> = {}): TemplateSet {
	return {
		id: templateSetId,
		label: 'Klasse 1',
		subjects: [
			{
				id: visibleSubjectId,
				label: 'Deutsch',
				categories: [
					{
						id: categoryId,
						label: 'Lesen',
						grades: [
							{
								id: gradeId,
								label: '2',
								value: 2,
								variants: [
									{
										id: variantId,
										label: 'gut',
										sentences: [{ type: 'text', value: 'Liest gut.' }],
									},
								],
							},
						],
					},
				],
			},
			{
				id: hiddenSubjectId,
				label: 'Mathe',
				hidden: true,
				categories: [
					{
						id: '77777777-7777-4777-8777-777777777777',
						label: 'Rechnen',
						grades: [
							{
								id: '88888888-8888-4888-8888-888888888888',
								label: '2',
								value: 2,
								variants: [
									{
										id: '99999999-9999-4999-8999-999999999999',
										label: 'gut',
										sentences: [{ type: 'text', value: 'Rechnet gut.' }],
									},
								],
							},
						],
					},
				],
			},
		],
		...overrides,
	}
}

function buildStudent(): Student {
	return {
		id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		name: 'Anna',
		surname: 'Schmidt',
		gender: 'female',
		templateSetId,
		reportSelection: {
			categories: {
				[categoryId]: { gradeId, variantIds: [variantId] },
				'77777777-7777-4777-8777-777777777777': {
					gradeId: '88888888-8888-4888-8888-888888888888',
					variantIds: ['99999999-9999-4999-8999-999999999999'],
				},
			},
			expandedCategoryIds: [],
		},
	}
}

describe('templateVisibility', () => {
	it('identifies template editor roles', () => {
		expect(canSeeHiddenTemplates('owner')).toBe(true)
		expect(canSeeHiddenTemplates('admin')).toBe(true)
		expect(canSeeHiddenTemplates('templateManager')).toBe(true)
		expect(canSeeHiddenTemplates('teacher')).toBe(false)
	})

	it('hides whole template sets from teachers', () => {
		const hiddenSet = buildTemplateSet({ hidden: true })
		expect(filterTemplateSetForRole(hiddenSet, false)).toBeNull()
		expect(filterTemplateSetForRole(hiddenSet, true)?.hidden).toBe(true)
	})

	it('strips hidden subjects for teachers', () => {
		const templateSet = buildTemplateSet()
		const visible = getVisibleSubjects(templateSet, false)
		expect(visible).toHaveLength(1)
		expect(visible[0]?.label).toBe('Deutsch')
	})

	it('summarizes only visible subjects for teachers', () => {
		const summary = summarizeVisibleTemplateSet(buildTemplateSet(), false)
		expect(summary.subjectCount).toBe(1)
		expect(summary.subjects).toEqual(['Deutsch'])
	})

	it('excludes hidden subjects from teacher report output', () => {
		const student = buildStudent()
		const templateSet = buildTemplateSet()
		const segments = buildReportSegments(student, templateSet, { excludeHiddenSubjects: true })
		expect(segments).toHaveLength(1)
		expect(buildReportPlainText(student, templateSet, { excludeHiddenSubjects: true })).toBe('Liest gut.')
	})

	it('includes hidden subjects for template editors in report output', () => {
		const student = buildStudent()
		const templateSet = buildTemplateSet()
		const segments = buildReportSegments(student, templateSet)
		expect(segments).toHaveLength(2)
	})

	it('counts only visible categories in selection coverage for teachers', () => {
		const student = buildStudent()
		const templateSet = buildTemplateSet()
		const summary = buildSelectionCoverageSummary(student, templateSet, { excludeHiddenSubjects: true })
		expect(summary.total).toBe(1)
	})
})
