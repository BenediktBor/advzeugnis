import { describe, expect, it } from 'vitest'
import { repairStoredStudents } from '~/stores/students'
import { defaultUser, repairStoredCurrentUser } from '~/stores/currentUser'
import { defaultMembers, repairStoredSchoolMembers } from '~/stores/school'
import { sanitizeTemplateSetsRecord } from '~/stores/templates'
import type { TemplateSet } from '~/types/template'

describe('persisted state repair helpers', () => {
	it('drops invalid stored students instead of keeping raw data', () => {
		const repaired = repairStoredStudents([
			{
				id: 'student-1',
				name: 'Max',
				surname: 'Muller',
				gender: 'male',
				templateSetId: 'set-1',
			},
			{
				id: 'student-2',
				name: 'Erika',
				surname: 'Muster',
				gender: 'invalid',
				templateSetId: 'set-2',
			} as never,
		])

		expect(repaired).toEqual([
			{
				id: 'student-1',
				name: 'Max',
				surname: 'Muller',
				gender: 'male',
				templateSetId: 'set-1',
			},
		])
	})

	it('resets invalid current user payloads to the default demo user', () => {
		const repaired = repairStoredCurrentUser({
			id: 'user-1',
			displayName: 'Broken User',
			email: 'broken@example.com',
			type: 'enterprise',
		} as never)

		expect(repaired).toEqual(defaultUser)
	})

	it('repairs school members by filtering invalid entries', () => {
		const repaired = repairStoredSchoolMembers([
			defaultMembers[0]!,
			{
				id: 'broken-member',
				displayName: 'Broken',
				email: 'broken@example.com',
				role: 'principal',
			} as never,
		])

		expect(repaired).toEqual([defaultMembers[0]])
	})

	it('drops invalid template sets during persisted-state sanitization', () => {
		const validSetId = '11111111-1111-1111-1111-111111111111'
		const validTemplateSet: TemplateSet = {
			id: validSetId,
			label: 'Klasse 1',
			subjects: [],
		}

		const repaired = sanitizeTemplateSetsRecord({
			[validSetId]: validTemplateSet,
			['22222222-2222-2222-2222-222222222222']: {
				id: 'not-a-uuid',
				label: 'Defekt',
				subjects: [],
			} as TemplateSet,
		})

		expect(repaired).toEqual({
			[validSetId]: validTemplateSet,
		})
	})
})
