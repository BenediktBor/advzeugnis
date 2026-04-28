<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import StudentCreateModal from '~/components/StudentCreateModal.vue'
import { studentFullName } from '~/utils/student'

const open = ref(false)
const router = useRouter()
const { students } = useStudents()
const { canEditTemplates } = useCurrentUser()
// const { currentUser, canEditTemplates } = useCurrentUser()
const { setsWithData, hasAnyTemplateSets } = useTemplateSets()
const createStudentModalOpen = ref(false)

function onAddStudent() {
	createStudentModalOpen.value = true
	open.value = false
}

function onAddTemplate() {
	open.value = false
	void router.push({ path: '/app/templates', query: { create: '1' } })
}

/*
const accountNavItem = computed<NavigationMenuItem>(() =>
	currentUser.value.type === 'school'
		? {
				label: 'Schule',
				icon: 'i-lucide-building-2',
				to: '/app/school',
				onSelect: () => {
					open.value = false
				},
		  }
		: {
				label: 'Benutzer',
				icon: 'i-lucide-user',
				to: '/app/user',
				onSelect: () => {
					open.value = false
				},
		  }
)
*/

const links = computed<NavigationMenuItem[]>(() => {
	const hasStudents = students.value.length > 0
	return [
		// accountNavItem.value,
		{
			label: 'Schüler',
			icon: 'i-lucide-users',
			to: '/app/students',
			...(hasStudents && {
				defaultOpen: true,
				children: students.value.map((s) => ({
					label: studentFullName(s),
					to: `/app/students/${s.id}`,
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
			to: '/app/templates',
			defaultOpen: true,
			children: setsWithData.value.map((setItem) => ({
				label: setItem.label,
				to: `/app/templates/${setItem.id}`,
				onSelect: () => {
					open.value = false
				},
			})),
			slot: 'templates' as const,
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
				<ULink
					v-if="collapsed"
					to="/"
					class="flex items-center justify-center w-full"
					aria-label="AdvancedZeugnis"
				>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-5 text-primary mx-auto"
					/>
				</ULink>
				<ULink
					v-else
					to="/"
					class="flex items-center gap-2 min-w-0 font-semibold text-highlighted hover:text-primary transition-colors"
				>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-5 text-primary shrink-0"
					/>
					<span class="truncate">AdvancedZeugnis</span>
				</ULink>
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
							<UTooltip
								v-if="hasAnyTemplateSets"
								text="Neuen Schüler anlegen"
							>
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
					<template #templates-trailing>
						<div class="flex items-center gap-1">
							<TemplateImportExportActions
								:can-edit="canEditTemplates"
								:disabled="setsWithData.length === 0"
								compact
							/>
							<UTooltip v-if="canEditTemplates" text="Neuen Vorlagensatz anlegen">
								<UButton
									icon="i-lucide-plus"
									color="neutral"
									variant="ghost"
									size="xs"
									aria-label="Neuen Vorlagensatz anlegen"
									@click.stop.prevent="onAddTemplate"
								/>
							</UTooltip>
							<UIcon
								v-if="setsWithData.length > 0"
								name="i-lucide-chevron-down"
								class="size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
							/>
						</div>
					</template>
				</UNavigationMenu>
			</template>

			<!--
			<template #footer="{ collapsed }">
				<UButton
					:to="
						currentUser.type === 'school'
							? '/app/school'
							: '/app/user'
					"
					:avatar="{
						src:
							'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
							currentUser.id,
						alt: currentUser.displayName,
					}"
					:label="
						collapsed
							? undefined
							: currentUser.displayName +
							  (currentUser.role ? ` (${currentUser.role})` : '')
					"
					color="neutral"
					variant="ghost"
					block
					:square="collapsed"
					class="data-[state=open]:bg-elevated"
				/>
			</template>
			-->
		</UDashboardSidebar>

		<slot />

		<StudentCreateModal v-model:open="createStudentModalOpen" />
	</UDashboardGroup>
</template>
