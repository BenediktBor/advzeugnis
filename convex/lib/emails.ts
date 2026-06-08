type SchoolRole = 'admin' | 'templateManager' | 'teacher'

export const BRAND = {
	primary: '#f59e0b',
	primaryDark: '#d97706',
	primarySoft: '#fffbeb',
	text: '#3f3f46',
	heading: '#18181b',
	muted: '#71717a',
	surface: '#ffffff',
	page: '#fafafa',
} as const

const FOOTER_LINE = 'Falls du diese E-Mail nicht erwartet hast, kannst du sie einfach ignorieren.'
const PRODUCT_NAME = 'AdvancedZeugnis'
const FONT = '-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif'
export const EMAIL_ICON_URL = 'https://advancedzeugnis.com/email-icon.png'

const ROLE_LABELS: Record<SchoolRole, string> = {
	admin: 'Admin',
	templateManager: 'Template Manager',
	teacher: 'Lehrer',
}

export function formatSchoolRole(role: SchoolRole) {
	return ROLE_LABELS[role]
}

type EmailContent = {
	subject: string
	text: string
	html?: string
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll('\'', '&#39;')
}

function formatInviterPhrase(inviterName: string) {
	if (inviterName.includes('@')) {
		return 'Du wurdest eingeladen'
	}
	return `${inviterName} lädt dich ein`
}

function buildBrandIconHtml() {
	return `<img src="${EMAIL_ICON_URL}" width="22" height="22" alt="" style="display:block;border:0;margin:0 auto;" />`
}

function buildBrandHeaderHtml() {
	return `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
      <tr>
        <td width="36" valign="middle" style="width:36px;padding:0 10px 0 0;vertical-align:middle;">
          <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="36" height="36" style="border-collapse:collapse;width:36px;height:36px;">
            <tr>
              <td align="center" valign="middle" width="36" height="36" style="width:36px;height:36px;border-radius:9px;background-color:${BRAND.primarySoft};vertical-align:middle;text-align:center;">
                ${buildBrandIconHtml()}
              </td>
            </tr>
          </table>
        </td>
        <td valign="middle" style="padding:0;vertical-align:middle;font-size:15px;line-height:20px;font-family:${FONT};font-weight:600;color:${BRAND.heading};word-break:break-word;overflow-wrap:break-word;white-space:normal;">
          ${PRODUCT_NAME}
        </td>
      </tr>
    </table>`
}

type BrandedEmailAction =
	| { type: 'cta', label: string, url: string }
	| { type: 'code', value: string }

function buildParagraphRows(paragraphs: string[]) {
	return paragraphs
		.map((paragraph) => `
            <tr>
              <td align="left" style="padding:0 0 14px 0;font-size:16px;line-height:26px;font-family:${FONT};color:${BRAND.text};word-break:break-word;overflow-wrap:break-word;white-space:normal;">
                ${paragraph}
              </td>
            </tr>`)
		.join('')
}

function buildActionRow(action: BrandedEmailAction) {
	if (action.type === 'cta') {
		const safeCtaLabel = escapeHtml(action.label)
		const safeCtaUrl = escapeHtml(action.url)
		return `
                <tr>
                  <td align="left" style="padding:10px 0 4px 0;word-break:break-word;overflow-wrap:break-word;white-space:normal;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;background-color:${BRAND.primary};mso-padding-alt:14px 28px;">
                          <a href="${safeCtaUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;line-height:20px;font-family:${FONT};color:#ffffff;text-decoration:none;font-weight:600;white-space:normal;">
                            ${safeCtaLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
	}

	const safeCode = escapeHtml(action.value)
	return `
                <tr>
                  <td align="left" style="padding:10px 0 4px 0;word-break:break-word;overflow-wrap:break-word;white-space:normal;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td align="center" style="padding:16px 20px;border-radius:10px;background-color:${BRAND.primarySoft};font-size:28px;line-height:36px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;letter-spacing:0.2em;color:${BRAND.heading};word-break:break-word;overflow-wrap:break-word;white-space:normal;">
                          ${safeCode}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
}

function buildBrandedEmailHtml(args: {
	headline: string
	paragraphs: string[]
	action: BrandedEmailAction
}) {
	const safeHeadline = escapeHtml(args.headline)

	return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeHeadline}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 20px 0;word-break:break-word;overflow-wrap:break-word;white-space:normal;">
              ${buildBrandHeaderHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;background-color:${BRAND.surface};border-radius:16px;word-break:break-word;overflow-wrap:break-word;white-space:normal;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 12px 0;font-size:24px;line-height:32px;font-family:${FONT};font-weight:700;color:${BRAND.heading};word-break:break-word;overflow-wrap:break-word;white-space:normal;">
                    ${safeHeadline}
                  </td>
                </tr>
                ${buildParagraphRows(args.paragraphs)}
                ${buildActionRow(args.action)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;font-size:13px;line-height:20px;font-family:${FONT};color:${BRAND.muted};text-align:center;word-break:break-word;overflow-wrap:break-word;white-space:normal;">
              ${FOOTER_LINE}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildCtaEmailHtml(args: {
	headline: string
	paragraphs: string[]
	ctaLabel: string
	ctaUrl: string
}) {
	return buildBrandedEmailHtml({
		headline: args.headline,
		paragraphs: args.paragraphs,
		action: { type: 'cta', label: args.ctaLabel, url: args.ctaUrl },
	})
}

export function buildSchoolInviteEmail(args: {
	schoolName: string
	inviterName: string
	role: SchoolRole
	inviteUrl: string
}): EmailContent {
	const roleLabel = formatSchoolRole(args.role)
	const safeSchoolName = escapeHtml(args.schoolName)
	const safeRoleLabel = escapeHtml(roleLabel)
	const inviterPhrase = formatInviterPhrase(args.inviterName)
	const safeInviterPhrase = escapeHtml(inviterPhrase)
	const subject = `${args.schoolName} lädt dich zu AdvancedZeugnis ein`
	const text = [
		'Hallo,',
		'',
		`${inviterPhrase}, gemeinsam an Zeugnissen für ${args.schoolName} zu arbeiten – bei AdvancedZeugnis, als ${roleLabel}.`,
		'',
		'Mit AdvancedZeugnis bereitet ihr Zeugnistexte effizient vor: Vorlagen pflegen, Schüler verwalten und fertige Formulierungen übernehmen.',
		'',
		'Einladung annehmen:',
		args.inviteUrl,
		'',
		'Der Link bleibt 14 Tage gültig.',
		'',
		FOOTER_LINE,
	].join('\n')
	const html = buildCtaEmailHtml({
		headline: `Gemeinsam Zeugnisse schreiben`,
		paragraphs: [
			`${safeInviterPhrase}, bei <strong>${safeSchoolName}</strong> mitzuarbeiten – als <strong>${safeRoleLabel}</strong>.`,
			'Mit AdvancedZeugnis bereitet ihr Zeugnistexte effizient vor: Vorlagen pflegen, Schüler verwalten und fertige Formulierungen übernehmen.',
			'Ein Klick genügt – danach kannst du direkt loslegen. Die Einladung ist 14 Tage gültig.',
		],
		ctaLabel: 'Einladung annehmen',
		ctaUrl: args.inviteUrl,
	})

	return { subject, text, html }
}

export function buildMagicLinkEmail(url: string): EmailContent {
	const subject = 'Dein Anmeldelink für AdvancedZeugnis'
	const text = [
		'Hallo,',
		'',
		'hier ist dein persönlicher Anmeldelink für AdvancedZeugnis.',
		'',
		'Jetzt anmelden:',
		url,
		'',
		'Aus Sicherheitsgründen ist der Link nur kurze Zeit gültig.',
		'',
		FOOTER_LINE,
	].join('\n')
	const html = buildCtaEmailHtml({
		headline: 'Schön, dass du wieder da bist',
		paragraphs: [
			'Hier ist dein persönlicher Anmeldelink. Ein Klick – und du bist wieder in AdvancedZeugnis.',
			'Aus Sicherheitsgründen ist der Link nur kurze Zeit gültig.',
		],
		ctaLabel: 'Jetzt anmelden',
		ctaUrl: url,
	})

	return { subject, text, html }
}

export function buildEmailVerificationEmail(token: string): EmailContent {
	const subject = 'Willkommen bei AdvancedZeugnis – bestätige deine E-Mail'
	const text = [
		'Hallo,',
		'',
		'schön, dass du dabei bist! Nur noch ein kurzer Schritt:',
		'',
		'Bestätige deine E-Mail-Adresse mit diesem Code:',
		'',
		token,
		'',
		'Der Code ist nur für kurze Zeit gültig.',
		'',
		FOOTER_LINE,
	].join('\n')

	const html = buildBrandedEmailHtml({
		headline: 'Willkommen bei AdvancedZeugnis',
		paragraphs: [
			'Schön, dass du dabei bist! Nur noch ein kurzer Schritt:',
			'Bestätige deine E-Mail-Adresse mit diesem Code. Er ist nur für kurze Zeit gültig.',
		],
		action: { type: 'code', value: token },
	})

	return { subject, text, html }
}

export function buildPasswordResetEmail(token: string): EmailContent {
	const subject = 'Dein Code zum Zurücksetzen des Passworts'
	const text = [
		'Hallo,',
		'',
		'du möchtest dein Passwort für AdvancedZeugnis zurücksetzen? Kein Problem.',
		'',
		'Verwende diesen Code für ein neues Passwort:',
		'',
		token,
		'',
		'Der Code ist nur für kurze Zeit gültig.',
		'',
		FOOTER_LINE,
	].join('\n')
	const html = buildBrandedEmailHtml({
		headline: 'Passwort zurücksetzen',
		paragraphs: [
			'Du möchtest dein Passwort für AdvancedZeugnis zurücksetzen? Kein Problem.',
			'Verwende diesen Code für ein neues Passwort. Er ist nur für kurze Zeit gültig.',
		],
		action: { type: 'code', value: token },
	})

	return { subject, text, html }
}
