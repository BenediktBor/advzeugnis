export const SHOW_LANDING_PRICING = false

export const landingAnchorIds = {
	demo: 'demo',
	features: 'funktionen',
	workflow: 'so-funktionierts',
	pricing: 'preise',
} as const

export function landingNavItems(showPricing = SHOW_LANDING_PRICING) {
	const items = [
		{ label: 'Demo', to: `#${landingAnchorIds.demo}` },
		{ label: 'Funktionen', to: `#${landingAnchorIds.features}` },
		{ label: 'So funktioniert\'s', to: `#${landingAnchorIds.workflow}` },
	]
	if (showPricing) {
		items.push({ label: 'Preise', to: `#${landingAnchorIds.pricing}` })
	}
	return items
}

export const landingDemoLink = {
	label: 'Live-Demo ansehen',
	to: `#${landingAnchorIds.demo}`,
	color: 'neutral' as const,
	variant: 'outline' as const,
	size: 'xl' as const,
}

export const landingHeroLinks = [
	{ label: 'Kostenlos starten', to: '/sign-in', size: 'xl' as const },
	landingDemoLink,
]

export const landingDemoTabs = [
	{
		label: 'Zeugnis erstellen',
		value: 'report',
		icon: 'i-lucide-file-text',
		badge: 'Interaktiv',
		slot: 'report' as const,
	},
	{
		label: 'Sätze erstellen',
		value: 'sentences',
		icon: 'i-lucide-pencil-line',
		badge: 'Interaktiv',
		slot: 'sentences' as const,
	},
]

export const landingFeatures = [
	{
		icon: 'i-lucide-languages',
		title: 'Geschlechtsvarianten',
		description: 'Satzbausteine passen sich automatisch an männliche und weibliche Schülerinnen und Schüler an.',
	},
	{
		icon: 'i-lucide-zap',
		title: 'Live-Textausgabe',
		description: 'Wähle Notenstufen und Formulierungen — der Zeugnistext entsteht sofort nebenan.',
	},
	{
		icon: 'i-lucide-users',
		title: 'Schülerverwaltung',
		description: 'Alle Schüler an einem Ort, mit Fortschrittsanzeige pro Kategorie.',
	},
	{
		icon: 'i-lucide-building-2',
		title: 'Schulteam',
		description: 'Gemeinsame Satzvorlagen für mehrere Lehrkräfte mit Rollen und Berechtigungen.',
	},
	{
		icon: 'i-lucide-file-input',
		title: 'Import & Export',
		description: 'Vorlagensätze als .azset-Datei teilen, sichern und wiederverwenden.',
	},
]

export const landingStepperItems = [
	{
		slot: 'step1',
		title: 'Vorlagen anlegen',
		description: 'Erstelle Satzvorlagen oder importiere bestehende .azset-Dateien.',
		icon: 'i-lucide-file-text',
	},
	{
		slot: 'step2',
		title: 'Schüler anlegen',
		description: 'Lege Schülerinnen und Schüler mit Name, Geschlecht und Vorlagensatz an.',
		icon: 'i-lucide-user-plus',
	},
	{
		slot: 'step3',
		title: 'Text kopieren',
		description: 'Wähle Noten und Varianten — kopiere den fertigen Zeugnistext.',
		icon: 'i-lucide-copy',
	},
]

export const landingStepCards = [
	{
		icon: 'i-lucide-file-text',
		title: 'Satzvorlagen strukturieren',
		description: 'Organisiere Textbausteine nach Fach, Kategorie, Stufe und Variante — mit Geschlechtsformen und optionalen Zusätzen.',
	},
	{
		icon: 'i-lucide-users',
		title: 'Schüler verwalten',
		description: 'Pflege Stammdaten und weise jedem Schüler den passenden Vorlagensatz zu.',
	},
	{
		icon: 'i-lucide-clipboard-check',
		title: 'Zeugnis fertigstellen',
		description: 'Klicke dich durch die Kategorien, sieh den Text live entstehen und kopiere ihn ins Schulverwaltungsprogramm.',
	},
]

export const landingPricingPlans = [
	{
		title: 'Solo',
		description: 'Für Einzelnutzer',
		tagline: 'Erste 2 Monate kostenlos',
		price: '1,99 €',
		billingCycle: '/Monat',
		features: [
			'Persönliche Zeugnisverwaltung',
			'Alle Jahrgangs-Vorlagen',
			'Unbegrenzt viele Schüler',
		],
		button: { label: 'Kostenlos testen', to: '/sign-in' },
	},
	{
		title: 'Schule',
		description: 'Für Teams',
		price: 'Auf Anfrage',
		features: [
			'Mehrere Lehrkräfte mit unterschiedlichen Rollen',
			'Zentrale Satzvorlagenverwaltung',
			'Unbegrenzt viele Schüler pro Lehrer',
		],
		button: {
			label: 'Live-Demo ansehen',
			to: `#${landingAnchorIds.demo}`,
			color: 'neutral' as const,
			variant: 'outline' as const,
		},
		scale: true,
	},
]

export const landingCtaLinks = [
	{ label: 'Kostenlos registrieren', to: '/register', size: 'xl' as const },
	landingDemoLink,
]

export const landingFooterColumns = [
	{
		label: 'Rechtliches',
		children: [
			{ label: 'Impressum', to: '/impressum' },
			{ label: 'Datenschutz', to: '/datenschutz' },
		],
	},
]
