<script setup lang="ts">
definePageMeta({ layout: 'default' })

useAppSeo({ title: 'Anmelden' })
</script>

<template>
	<UContainer class="flex min-h-screen items-start justify-center py-8 sm:py-10 lg:items-center lg:py-12">
		<AuthFlowCard initial-mode="signIn" />
	</UContainer>
</template>
