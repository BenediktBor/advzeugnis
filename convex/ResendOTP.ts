import ResendProvider from '@auth/core/providers/resend'
import { generateRandomString } from '@oslojs/crypto/random'
import type { RandomReader } from '@oslojs/crypto/random'

declare const process: {
	env: {
		AUTH_RESEND_KEY?: string
		AUTH_EMAIL_FROM?: string
	}
}

type ResendOTPOptions = {
	id: string
	subject: string
	body: (token: string) => string
}

type SendResendEmailArgs = {
	to: string
	subject: string
	text: string
}

export async function sendResendEmail(args: SendResendEmailArgs) {
	const apiKey = process.env.AUTH_RESEND_KEY
	if (!apiKey) throw new Error('Missing AUTH_RESEND_KEY')

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: process.env.AUTH_EMAIL_FROM || 'AdvancedZeugnis <onboarding@resend.dev>',
			to: [args.to],
			subject: args.subject,
			text: args.text,
		}),
		signal: AbortSignal.timeout(12_000),
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Resend email failed: ${response.status} ${body}`)
	}

	return await response.json() as { id?: string }
}

export function createResendOTPProvider(options: ResendOTPOptions) {
	return ResendProvider({
		id: options.id,
		apiKey: process.env.AUTH_RESEND_KEY,
		from: process.env.AUTH_EMAIL_FROM || 'AdvancedZeugnis <onboarding@resend.dev>',
		async generateVerificationToken() {
			const random: RandomReader = {
				read(bytes) {
					const randomBytes = crypto.getRandomValues(new Uint8Array(bytes.length))
					bytes.set(randomBytes)
				},
			}
			return generateRandomString(random, '0123456789', 8)
		},
		async sendVerificationRequest({ identifier: email, token }) {
			await sendResendEmail({
				to: email,
				subject: options.subject,
				text: options.body(token),
			})
		},
	})
}
