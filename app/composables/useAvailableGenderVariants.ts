import { collectGenderVariantsFromTemplateSets } from '~/utils/collectGenderVariants'
import type { GenderVariantOption } from '~/utils/collectGenderVariants'
import { useTemplatesStore } from '~/stores/templates'

export function useAvailableGenderVariants(): ComputedRef<GenderVariantOption[]> {
	const { orderedIds } = useTemplateSets()
	const store = useTemplatesStore()
	store.load()

	return computed(() => {
		const sets = orderedIds.value
			.map((setId) => store.getSetData(setId))
			.filter((set): set is NonNullable<typeof set> => set != null)
		return collectGenderVariantsFromTemplateSets(sets)
	})
}
