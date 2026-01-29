<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const router = useRouter()
const { students, addStudent } = useStudents()
const years = useTemplateYears()

const UNNAMED_STUDENT_LABEL = 'Unbenannt'

function studentFullName(s: { name: string; surname: string }) {
	return (
		[s.name, s.surname].filter(Boolean).join(' ') || UNNAMED_STUDENT_LABEL
	)
}

function onAddStudent() {
	const defaultYear = years.value[0] ?? 2024
	const newId = addStudent({
		name: '',
		surname: '',
		gender: 'male',
		templateYear: defaultYear,
	})
	open.value = false
	router.push(`/students/${newId}`)
}

const links = computed<NavigationMenuItem[]>(() => {
	const hasStudents = students.value.length > 0
	return [
		{
			label: 'Schüler',
			icon: 'i-lucide-users',
			to: '/students',
			...(hasStudents && {
				defaultOpen: true,
				children: students.value.map((s) => ({
					label: studentFullName(s),
					to: `/students/${s.id}`,
					onSelect: () => {
						open.value = false
					},
				})),
			}),
			slot: 'students' as const,
		},
		{
			label: 'Vorlagen',
			icon: 'i-lucide-file-text',
			to: '/templates',
			defaultOpen: true,
			children: years.value.map((y) => ({
				label: String(y),
				to: `/templates/${y}`,
				onSelect: () => {
					open.value = false
				},
			})),
		},
	]
})
</script>

<template>
	<UDashboardGroup storage-key="advanced-zeugnis" unit="rem">
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			class="bg-elevated/25"
			:ui="{ footer: 'lg:border-t lg:border-default' }"
		>
			<template #header="{ collapsed }">
				<UIcon
					v-if="collapsed"
					name="i-lucide-graduation-cap"
					class="size-5 text-primary mx-auto"
				/>
				<template v-else>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-5 text-primary shrink-0"
					/>
					<span class="font-semibold truncate">AdvancedZeugnis</span>
				</template>
			</template>

			<template #default="{ collapsed }">
				<UNavigationMenu
					:collapsed="collapsed"
					:items="links"
					orientation="vertical"
					tooltip
					popover
				>
					<template #students-trailing>
						<div class="flex items-center gap-1">
							<UTooltip text="Neuen Schüler anlegen">
								<UButton
									icon="i-lucide-plus"
									color="neutral"
									variant="ghost"
									size="xs"
									aria-label="Neuen Schüler anlegen"
									@click.stop.prevent="onAddStudent"
								/>
							</UTooltip>
							<UIcon
								v-if="students.length > 0"
								name="i-lucide-chevron-down"
								class="size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
							/>
						</div>
					</template>
				</UNavigationMenu>
			</template>

			<template #footer="{ collapsed }">
				<UButton
					:avatar="{
						src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
						alt: 'Benutzer',
					}"
					:label="collapsed ? undefined : 'Benutzer'"
					color="neutral"
					variant="ghost"
					block
					:square="collapsed"
					class="data-[state=open]:bg-elevated"
				/>
			</template>
		</UDashboardSidebar>

		<slot />
	</UDashboardGroup>
</template>
