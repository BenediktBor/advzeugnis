import { describe, it, expect } from 'vitest'
import { studentFullName } from '~/utils/student'

describe('studentFullName', () => {
	it('joins name and surname with a space', () => {
		expect(studentFullName({ name: 'Max', surname: 'Müller' })).toBe('Max Müller')
	})

	it('returns just name when surname is empty', () => {
		expect(studentFullName({ name: 'Max', surname: '' })).toBe('Max')
	})

	it('returns just surname when name is empty', () => {
		expect(studentFullName({ name: '', surname: 'Müller' })).toBe('Müller')
	})

	it('returns "Unbenannt" when both are empty', () => {
		expect(studentFullName({ name: '', surname: '' })).toBe('Unbenannt')
	})

	it('treats whitespace-only name as empty', () => {
		expect(studentFullName({ name: '   ', surname: 'Müller' })).toBe('Müller')
	})

	it('treats whitespace-only surname as empty', () => {
		expect(studentFullName({ name: 'Max', surname: '   ' })).toBe('Max')
	})

	it('treats whitespace-only name and surname as empty', () => {
		expect(studentFullName({ name: '   ', surname: '   ' })).toBe('Unbenannt')
	})

	it('trims leading/trailing whitespace before joining', () => {
		expect(studentFullName({ name: '  Max  ', surname: '  Müller  ' })).toBe('Max Müller')
	})
})
