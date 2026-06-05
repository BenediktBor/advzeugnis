<script setup lang="ts">
import { api } from '~/utils/convexApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const client = useConvexClient()
const { isAuthenticated } = useCurrentUser()
const { signIn } = useConvexAuthActions()

const isAccepting = ref(false)
const error = ref('')

const token = computed(() => String(route.params.token || ''))

async function onAccept() {
	error.value = ''
	if (!isAuthenticated.value) {
		await signIn('google', route.fullPath)
		return
	}

	isAccepting.value = true
	try {
		await client.mutation(api.schools.acceptInvite, { token: token.value })
		await router.push('/app/school')
	} catch (err) {
		console.error('[school] invite acceptance failed:', err)
		error.value = 'Einladung konnte nicht angenommen werden.'
	} finally {
		isAccepting.value = false
	}
}
</script>

<template>
	<UContainer class="flex min-h-screen items-center justify-center py-12">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="space-y-1">
					<h1 class="text-xl font-semibold text-highlighted">Schuleinladung</h1>
					<p class="text-sm text-muted">
						Melde dich an und tritt der Schule kostenlos über die Einladung bei.
					</p>
				</div>
			</template>

			<div class="flex flex-col gap-4">
				<UAlert v-if="error" color="error" variant="soft" :title="error" />
				<UButton
					:label="isAuthenticated ? 'Einladung annehmen' : 'Anmelden und Einladung annehmen'"
					icon="i-lucide-mail-check"
					:loading="isAccepting"
					@click="onAccept"
				/>
			</div>
		</UCard>
	</UContainer>
</template>
