declare module 'sortablejs' {
	export type SortableEvent = {
		oldIndex?: number
		newIndex?: number
		from?: HTMLElement
		item?: HTMLElement
	}

	export type SortableOptions = {
		draggable?: string
		handle?: string
		animation?: number
		ghostClass?: string
		forceFallback?: boolean
		fallbackOnBody?: boolean
		onStart?: (evt: SortableEvent) => void
		onEnd?: (evt: SortableEvent) => void
	}

	export default class Sortable {
		constructor(element: HTMLElement, options?: SortableOptions)
		destroy(): void
	}
}
