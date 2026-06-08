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
		<UFooterColumns :columns="landingFooterColumns" />
	</UFooter>
</template>
