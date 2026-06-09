<script setup lang="ts">
import { landingFooterColumns } from '~/data/landingContent'

const year = new Date().getFullYear()
</script>

<template>
	<UFooter>
		<template #left>
			<p class="text-sm text-muted">
				© {{ year }} AdvancedZeugnis
			</p>
		</template>
		<UFooterColumns
			:columns="landingFooterColumns"
			:ui="{
				center: 'items-center text-center',
				list: 'mt-6 flex list-none flex-col items-center gap-4 space-y-0 lg:flex-row lg:items-center lg:justify-center lg:gap-x-6',
			}"
		/>
	</UFooter>
</template>
