<script setup lang="ts">
useAppSeo({ title: 'Impressum' })
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<header
			class="sticky top-0 z-10 border-b border-default bg-default/95 backdrop-blur supports-backdrop-filter:bg-default/80"
		>
			<UContainer class="flex h-14 items-center justify-between">
				<ULink
					to="/"
					class="flex items-center gap-2 font-semibold text-highlighted"
				>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-6 text-primary"
					/>
					AdvancedZeugnis
				</ULink>
				<UButton
					to="/sign-in"
					label="Anmelden"
					trailing-icon="i-lucide-arrow-right"
				/>
			</UContainer>
		</header>

		<main class="flex-1 py-12">
			<UContainer class="max-w-2xl">
				<h1 class="text-3xl font-semibold text-highlighted mb-8">
					Impressum
				</h1>

				<div class="space-y-8 text-default">
					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							Anbieterkennzeichnung
						</h2>
						<p>
							Benedikt Bornemann<br>
							An den Sieben Gäßchen 23<br>
							58636 Iserlohn<br>
							Deutschland
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							Kontakt
						</h2>
						<p>
							E-Mail:
							<ULink
								to="mailto:benedikt.bornemann@gmail.com"
								class="text-primary hover:underline"
							>
								benedikt.bornemann@gmail.com
							</ULink>
						</p>
					</section>
				</div>

				<div class="mt-10">
					<UButton
						to="/"
						label="Zurück zur Startseite"
						variant="outline"
						color="neutral"
						icon="i-lucide-arrow-left"
					/>
				</div>
			</UContainer>
		</main>
	</div>
</template>
