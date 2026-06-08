import Resend from '@auth/core/providers/resend'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import type { DataModel } from './_generated/dataModel'
import { createResendOTPProvider } from './ResendOTP'

declare const process: {
	env: {
		AUTH_RESEND_KEY?: string
		AUTH_EMAIL_FROM?: string
	}
}

function normalizeEmail(value: unknown) {
	if (typeof value !== 'string') throw new ConvexError('Email is required')
	const email = value.trim().toLowerCase()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Invalid email address')
	return email
}

const emailFrom = process.env.AUTH_EMAIL_FROM || 'AdvancedZeugnis <onboarding@resend.dev>'

const emailVerificationProvider = createResendOTPProvider({
	id: 'resend-email-verification',
	subject: 'AdvancedZeugnis E-Mail bestaetigen',
	body: (token) => `Dein AdvancedZeugnis Bestaetigungscode lautet: ${token}`,
})

const passwordResetProvider = createResendOTPProvider({
	id: 'resend-password-reset',
	subject: 'AdvancedZeugnis Passwort zuruecksetzen',
	body: (token) => `Dein AdvancedZeugnis Passwort-Zuruecksetzen-Code lautet: ${token}`,
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Password<DataModel>({
			verify: emailVerificationProvider,
			reset: passwordResetProvider,
			profile(params) {
				return {
					email: normalizeEmail(params.email),
				}
			},
			validatePasswordRequirements(password) {
				if (password.length < 8) {
					throw new ConvexError('Password must be at least 8 characters')
				}
			},
		}),
		Resend({
			id: 'resend',
			apiKey: process.env.AUTH_RESEND_KEY,
			from: emailFrom,
		}),
	],
})
