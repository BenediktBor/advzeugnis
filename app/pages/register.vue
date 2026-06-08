<script setup lang="ts">
definePageMeta({ layout: 'default' })

useAppSeo({ title: 'Registrieren' })
</script>

<template>
	<UContainer class="flex min-h-screen items-center justify-center py-12">
		<AuthFlowCard initial-mode="signUp" />
	</UContainer>
</template>
