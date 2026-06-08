<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import StudentCreateModal from '~/components/StudentCreateModal.vue'
import type { SchoolRole } from '~/types/user'
import { studentFullName } from '~/utils/student'

const roleLabels: Record<SchoolRole, string> = {
	owner: 'Owner',
	admin: 'Admin',
	templateManager: 'Template Manager',
	teacher: 'Lehrer',
}

const open = ref(false)
const router = useRouter()
const { students } = useStudents()
const { currentUser, hasSchool, canEditTemplates } = useCurrentUser()
const { signOut } = useConvexAuthActions()
const { sortedSetsWithData, hasAnyTemplateSets } = useTemplateSets()
const createStudentModalOpen = ref(false)

function onAddStudent() {
	if (!hasSchool.value) {
		open.value = false
		void router.push('/app/setup-school')
		return
	}
	createStudentModalOpen.value = true
	open.value = false
}

function onAddTemplate() {
	open.value = false
	void router.push({ path: '/app/templates', query: { create: '1' } })
}

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

const links = computed<NavigationMenuItem[]>(() => {
	const hasStudents = students.value.length > 0
	const items: NavigationMenuItem[] = [accountNavItem.value]

	if (hasSchool.value) {
		items.push({
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
		})
	}

	if (canEditTemplates.value) {
		items.push({
			label: 'Vorlagen',
			icon: 'i-lucide-file-text',
			to: '/app/templates',
			defaultOpen: true,
			children: sortedSetsWithData.value.map((setItem) => ({
				label: setItem.label,
				to: `/app/templates/${setItem.id}`,
				onSelect: () => {
					open.value = false
				},
			})),
			slot: 'templates' as const,
		})
	}

	return items
})

const sidebarRoleLabel = computed(() =>
	currentUser.value.role ? roleLabels[currentUser.value.role] : undefined,
)

function onProfileSignOut() {
	void signOut()
}

const profileAccountItems = computed(() => {
	const items = [
		{
			label: 'Benutzer',
			icon: 'i-lucide-user',
			to: '/app/user',
		},
	]
	if (currentUser.value.type === 'school') {
		items.unshift({
			label: 'Schule',
			icon: 'i-lucide-building-2',
			to: '/app/school',
		})
	}
	return items
})

const profileMenuItems = computed(() => [
	profileAccountItems.value,
	[
		{
			label: 'Abmelden',
			icon: 'i-lucide-log-out',
			onSelect: onProfileSignOut,
		},
	],
])
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
								v-if="hasSchool && hasAnyTemplateSets"
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
								:disabled="!hasAnyTemplateSets"
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
								v-if="hasAnyTemplateSets"
								name="i-lucide-chevron-down"
								class="size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
							/>
						</div>
					</template>
				</UNavigationMenu>
			</template>

			<template #footer="{ collapsed }">
				<div class="flex w-full min-w-0 flex-col">
					<UDropdownMenu
						:items="profileMenuItems"
						:content="{ side: 'top', align: collapsed ? 'center' : 'start' }"
						:modal="false"
						size="sm"
						class="w-full"
					>
						<UButton
							icon="i-lucide-user"
							size="sm"
							color="neutral"
							variant="ghost"
							block
							:square="collapsed"
							class="w-full min-w-0 data-[state=open]:bg-elevated"
							:ui="{
								base: 'w-full min-w-0 justify-start overflow-hidden',
								label: 'min-w-0 flex-1',
							}"
							:title="collapsed ? currentUser.displayName : undefined"
							@click.stop
						>
							<div
								v-if="!collapsed"
								class="flex min-w-0 flex-1 flex-col items-start text-left leading-tight"
							>
								<span class="w-full truncate">{{ currentUser.displayName }}</span>
								<span
									v-if="sidebarRoleLabel"
									class="w-full truncate text-xs text-muted"
								>
									{{ sidebarRoleLabel }}
								</span>
							</div>
						</UButton>
					</UDropdownMenu>
				</div>
			</template>
		</UDashboardSidebar>

		<slot />

		<StudentCreateModal v-model:open="createStudentModalOpen" />
	</UDashboardGroup>
</template>
