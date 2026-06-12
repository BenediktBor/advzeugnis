export type RemoteRevisionAction = 'apply' | 'conflict' | 'ignore'

export function shouldApplyRemoteRevision(
	syncedUpdatedAt: number | null,
	remoteUpdatedAt: number,
	hasPendingSync: boolean,
): RemoteRevisionAction {
	if (syncedUpdatedAt !== null && remoteUpdatedAt <= syncedUpdatedAt) return 'ignore'
	if (hasPendingSync) return 'conflict'
	return 'apply'
}

export function isTemplateConflictError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err)
	return message.includes('TEMPLATE_CONFLICT')
}
