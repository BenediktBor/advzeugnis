/**
 * Type declarations for the Writing Assistance Rewriter API
 * @see https://github.com/webmachinelearning/writing-assistance-apis
 */

export type RewriterAvailability =
	| 'unavailable'
	| 'downloadable'
	| 'downloading'
	| 'available'

export type RewriterTone = 'as-is' | 'more-formal' | 'more-casual'
export type RewriterFormat = 'as-is' | 'plain-text' | 'markdown'
export type RewriterLength = 'as-is' | 'shorter' | 'longer'

export interface RewriterCreateCoreOptions {
	tone?: RewriterTone
	format?: RewriterFormat
	length?: RewriterLength
	expectedInputLanguages?: string[]
	expectedContextLanguages?: string[]
	outputLanguage?: string
	sharedContext?: string
}

export interface CreateMonitor extends EventTarget {
	addEventListener(
		type: 'downloadprogress',
		listener: (event: ProgressEvent) => void,
		options?: boolean | AddEventListenerOptions,
	): void
}

export type CreateMonitorCallback = (monitor: CreateMonitor) => void

export interface RewriterCreateOptions extends RewriterCreateCoreOptions {
	signal?: AbortSignal
	monitor?: CreateMonitorCallback
}

export interface RewriterRewriteOptions {
	context?: string
	signal?: AbortSignal
}

export interface RewriterInstance {
	rewrite(input: string, options?: RewriterRewriteOptions): Promise<string>
	rewriteStreaming(
		input: string,
		options?: RewriterRewriteOptions,
	): ReadableStream<string>
	destroy(): void
}

export interface RewriterConstructor {
	create(options?: RewriterCreateOptions): Promise<RewriterInstance>
	availability(
		options?: RewriterCreateCoreOptions,
	): Promise<RewriterAvailability>
}

declare global {
	interface Window {
		Rewriter?: RewriterConstructor
	}
}

export {}
