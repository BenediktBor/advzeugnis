export const genderVariantPresets = [
	{ label: 'Er/Sie', male: 'Er', female: 'Sie' },
	{ label: 'er/sie', male: 'er', female: 'sie' },
	{ label: 'Ihn/Sie', male: 'Ihn', female: 'Sie' },
	{ label: 'ihn/sie', male: 'ihn', female: 'sie' },
] as const

export type GenderVariantPreset = (typeof genderVariantPresets)[number]

export const studentGenderItems = [
	{ label: 'Männlich', value: 'male' as const },
	{ label: 'Weiblich', value: 'female' as const },
]
