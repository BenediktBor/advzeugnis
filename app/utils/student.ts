/**
 * Returns the full display name for a student (name + surname), or fallback when empty.
 */
export function studentFullName(s: { name: string; surname: string }): string {
	const name = s.name.trim()
	const surname = s.surname.trim()
	return [name, surname].filter(Boolean).join(' ') || 'Unbenannt'
}
