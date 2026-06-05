<script setup lang="ts">
import { getStoredAuthToken } from '~/utils/convexAuthClient'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const isAuthorized = ref(import.meta.client && Boolean(getStoredAuthToken()))

onMounted(() => {
	if (isAuthorized.value) return
	void navigateTo({
		path: '/sign-in',
		query: { redirect: route.fullPath },
	}, { replace: true })
})
</script>

<template>
	<NuxtPage v-if="isAuthorized" />
	<UDashboardPanel v-else>
		<template #body>
			<AppStateNotice
				title="Anmeldung erforderlich"
				description="Du wirst zur Anmeldung weitergeleitet."
				icon="i-lucide-lock"
				loading
			/>
		</template>
	</UDashboardPanel>
</template>
