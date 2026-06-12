import { describe, expect, it } from 'vitest'
import {
	formatGermanEditorPresenceText,
	getEditorInitials,
	sortEditorsByDisplayName,
	TEMPLATE_EDITOR_CONFLICT_PREVENTION_TEXT,
} from '~/utils/templateEditorPresence'

describe('getEditorInitials', () => {
	it('uses first letters of first and last name', () => {
		expect(getEditorInitials('Anna Becker')).toBe('AB')
	})

	it('uses email local part for email-only display names', () => {
		expect(getEditorInitials('solveddev@gmail.com')).toBe('SO')
	})
})

describe('sortEditorsByDisplayName', () => {
	it('sorts editors using German locale rules', () => {
		const sorted = sortEditorsByDisplayName([
			{ displayName: 'Zoe' },
			{ displayName: 'Anna' },
			{ displayName: 'Ben' },
		])
		expect(sorted.map((editor) => editor.displayName)).toEqual(['Anna', 'Ben', 'Zoe'])
	})
})

describe('formatGermanEditorPresenceText', () => {
	it('formats one editor', () => {
		expect(formatGermanEditorPresenceText([{ displayName: 'Anna' }])).toBe(
			'Anna bearbeitet diese Vorlage ebenfalls.',
		)
	})

	it('formats two editors', () => {
		expect(formatGermanEditorPresenceText([
			{ displayName: 'Ben' },
			{ displayName: 'Anna' },
		])).toBe('Anna und Ben bearbeiten diese Vorlage ebenfalls.')
	})

	it('formats three editors', () => {
		expect(formatGermanEditorPresenceText([
			{ displayName: 'Carla' },
			{ displayName: 'Anna' },
			{ displayName: 'Ben' },
		])).toBe('Anna, Ben und Carla bearbeiten diese Vorlage ebenfalls.')
	})

	it('exposes conflict prevention copy for the presence notice', () => {
		expect(TEMPLATE_EDITOR_CONFLICT_PREVENTION_TEXT).toContain('Konflikten')
	})

	it('formats four or more editors with overflow label', () => {
		expect(formatGermanEditorPresenceText([
			{ displayName: 'Dana' },
			{ displayName: 'Anna' },
			{ displayName: 'Ben' },
			{ displayName: 'Carla' },
		])).toBe('Anna, Ben und 2 weitere bearbeiten diese Vorlage ebenfalls.')
	})
})
