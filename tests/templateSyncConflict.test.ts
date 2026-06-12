import { describe, expect, it } from 'vitest'
import {
	isTemplateConflictError,
	shouldApplyRemoteRevision,
} from '~/utils/templateSyncRevision'

describe('shouldApplyRemoteRevision', () => {
	it('ignores remote revisions that are not newer than the synced revision', () => {
		expect(shouldApplyRemoteRevision(200, 200, false)).toBe('ignore')
		expect(shouldApplyRemoteRevision(200, 100, false)).toBe('ignore')
	})

	it('applies newer remote revisions when no local sync is pending', () => {
		expect(shouldApplyRemoteRevision(100, 200, false)).toBe('apply')
		expect(shouldApplyRemoteRevision(null, 200, false)).toBe('apply')
	})

	it('reports a conflict when a newer remote revision arrives during pending sync', () => {
		expect(shouldApplyRemoteRevision(100, 200, true)).toBe('conflict')
	})
})

describe('isTemplateConflictError', () => {
	it('detects Convex template conflict errors', () => {
		expect(isTemplateConflictError(new Error('Uncaught ConvexError: TEMPLATE_CONFLICT'))).toBe(true)
		expect(isTemplateConflictError(new Error('Network request failed'))).toBe(false)
	})
})
