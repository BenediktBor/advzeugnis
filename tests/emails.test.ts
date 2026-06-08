import { describe, expect, it } from 'vitest'
import {
	BRAND,
	EMAIL_ICON_URL,
	buildEmailVerificationEmail,
	buildMagicLinkEmail,
	buildPasswordResetEmail,
	buildSchoolInviteEmail,
	formatSchoolRole,
} from '../convex/lib/emails'

function expectBrandedEmailLayout(html: string | undefined) {
	expect(html).toBeDefined()
	expect(html).toContain('AdvancedZeugnis')
	expect(html).toContain(EMAIL_ICON_URL)
	expect(html).toContain(BRAND.primarySoft)
	expect(html).toContain('white-space:normal')
	expect(html).not.toContain('table-layout:fixed')
	expect(html).not.toContain('display:none')
}

describe('transactional email templates', () => {
	it('personalizes school invite emails with html and text', () => {
		const email = buildSchoolInviteEmail({
			schoolName: 'Grundschule Sonnenschein',
			inviterName: 'Anna Lehrerin',
			role: 'teacher',
			inviteUrl: 'https://example.com/invite/abc',
		})

		expect(email.subject).toBe('Grundschule Sonnenschein lädt dich zu AdvancedZeugnis ein')
		expect(email.text).toContain('Anna Lehrerin lädt dich ein')
		expect(email.text).toContain('Grundschule Sonnenschein')
		expect(email.text).toContain('Lehrer')
		expect(email.text).toContain('https://example.com/invite/abc')
		expect(email.html).toContain('Einladung annehmen')
		expect(email.html).toContain('Zeugnistexte')
		expectBrandedEmailLayout(email.html)
	})

	it('uses neutral phrasing when inviter is an email address', () => {
		const email = buildSchoolInviteEmail({
			schoolName: 'Bömberg',
			inviterName: 'benedikt.bornemann@gmail.com',
			role: 'teacher',
			inviteUrl: 'https://example.com/invite/abc',
		})

		expect(email.text).toContain('Du wurdest eingeladen')
		expect(email.text).not.toContain('benedikt.bornemann@gmail.com möchte')
		expect(email.html).toContain('Du wurdest eingeladen')
	})

	it('escapes user-provided names in invite html', () => {
		const email = buildSchoolInviteEmail({
			schoolName: '<script>alert(1)</script>',
			inviterName: 'Anna & Bob',
			role: 'admin',
			inviteUrl: 'https://example.com/invite/abc',
		})

		expect(email.html).not.toContain('<script>')
		expect(email.html).toContain('Anna &amp; Bob lädt dich ein')
		expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
	})

	it('builds german magic-link emails with html', () => {
		const email = buildMagicLinkEmail('https://example.com/auth/callback')

		expect(email.subject).toBe('Dein Anmeldelink für AdvancedZeugnis')
		expect(email.text).toContain('https://example.com/auth/callback')
		expect(email.html).toContain('Jetzt anmelden')
		expectBrandedEmailLayout(email.html)
		expect(email.html).not.toContain('Link funktioniert nicht')
	})

	it('builds branded verification emails with a code block', () => {
		const verification = buildEmailVerificationEmail('12345678')

		expect(verification.subject).toContain('Willkommen')
		expect(verification.text).toContain('12345678')
		expectBrandedEmailLayout(verification.html)
		expect(verification.html).toContain('12345678')
		expect(verification.html).not.toContain('Einladung annehmen')
		expect(verification.html).not.toContain('Jetzt anmelden')
	})

	it('builds branded password reset emails with a code block', () => {
		const reset = buildPasswordResetEmail('87654321')

		expect(reset.subject).toContain('Passwort')
		expect(reset.text).toContain('87654321')
		expectBrandedEmailLayout(reset.html)
		expect(reset.html).toContain('87654321')
		expect(reset.html).not.toContain('Einladung annehmen')
		expect(reset.html).not.toContain('Jetzt anmelden')
	})

	it('maps assignable school roles to ui labels', () => {
		expect(formatSchoolRole('admin')).toBe('Admin')
		expect(formatSchoolRole('templateManager')).toBe('Template Manager')
		expect(formatSchoolRole('teacher')).toBe('Lehrer')
	})
})
