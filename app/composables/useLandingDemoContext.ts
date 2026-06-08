import type { InjectionKey } from 'vue'
import type { LandingReportDemo } from '~/composables/useLandingReportDemo'

export const landingDemoKey: InjectionKey<LandingReportDemo> = Symbol('landingDemo')

export function provideLandingDemo(demo: LandingReportDemo) {
	provide(landingDemoKey, demo)
}

export function useLandingDemoContext() {
	const demo = inject(landingDemoKey)
	if (!demo) {
		throw new Error('useLandingDemoContext must be used within a landing demo provider')
	}
	return demo
}
