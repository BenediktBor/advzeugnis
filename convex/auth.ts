import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import type { DataModel } from './_generated/dataModel'
import { buildEmailVerificationEmail, buildPasswordResetEmail } from './lib/emails'
import { createResendMagicLinkProvider, createResendOTPProvider } from './ResendOTP'

function normalizeEmail(value: unknown) {
	if (typeof value !== 'string') throw new ConvexError('Email is required')
	const email = value.trim().toLowerCase()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Invalid email address')
	return email
}

const emailVerificationProvider = createResendOTPProvider({
	id: 'resend-email-verification',
	buildEmail: buildEmailVerificationEmail,
})

const passwordResetProvider = createResendOTPProvider({
	id: 'resend-password-reset',
	buildEmail: buildPasswordResetEmail,
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
		createResendMagicLinkProvider({
			id: 'resend',
		}),
	],
})
