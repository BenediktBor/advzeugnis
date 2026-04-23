<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SchoolMember } from '~/types/user'

const { currentUser, canManageTeachers } = useCurrentUser()
const { members, addMember, removeMember, setRole } = useSchool()

const roleLabels: Record<string, string> = {
	admin: 'Admin',
	editor: 'Editor',
	teacher: 'Lehrer',
}

const ROLE_OPTIONS = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Lehrer', value: 'teacher' },
]

const newMember = ref({ displayName: '', email: '', role: 'teacher' as const })
const showAddForm = ref(false)

const columns = computed<TableColumn<SchoolMember>[]>(() => [
	{ accessorKey: 'displayName', header: 'Name' },
	{ accessorKey: 'email', header: 'E-Mail' },
	{ accessorKey: 'role', header: 'Rolle' },
	...(canManageTeachers.value ? [{ id: 'actions', header: '' }] : []),
])

function handleAddMember() {
	if (!newMember.value.displayName.trim()) return
	addMember({
		displayName: newMember.value.displayName.trim(),
		email: newMember.value.email.trim() || undefined,
		role: newMember.value.role,
	})
	newMember.value = { displayName: '', email: '', role: 'teacher' }
	showAddForm.value = false
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar title="Schule">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-4">
				<p class="text-sm text-muted">
					Übersicht aller aktiven Lehrkräfte und ihrer Rollen.
				</p>
				<div
					v-if="!canManageTeachers"
					class="rounded-md border border-default bg-default p-3 text-sm text-muted"
				>
					Nur Admins können Lehrkräfte hinzufügen oder entfernen.
				</div>

				<UTable :data="members" :columns="columns">
					<template #email-cell="{ row }">
						{{ row.original.email ?? '–' }}
					</template>
					<template #role-cell="{ row }">
						<USelectMenu
							v-if="canManageTeachers"
							:items="ROLE_OPTIONS"
							:model-value="row.original.role"
							value-key="value"
							label-key="label"
							size="xs"
							class="min-w-28"
							@update:model-value="
								(v: unknown) => {
									const value =
										typeof v === 'object' &&
										v !== null &&
										'value' in v
											? (v as { value: string }).value
											: (v as string)
									setRole(
										row.original.id,
										value as 'admin' | 'editor' | 'teacher',
									)
								}
							"
						/>
						<span v-else class="text-sm text-muted">
							{{
								roleLabels[row.original.role] ??
								row.original.role
							}}
						</span>
					</template>
					<template #actions-cell="{ row }">
						<UButton
							v-if="
								canManageTeachers &&
								row.original.id !== currentUser.id
							"
							icon="i-lucide-trash-2"
							color="error"
							variant="ghost"
							size="xs"
							aria-label="Entfernen"
							@click="removeMember(row.original.id)"
						/>
					</template>
				</UTable>

				<div v-if="canManageTeachers" class="flex flex-col gap-2">
					<UButton
						v-if="!showAddForm"
						label="Lehrkraft hinzufügen"
						icon="i-lucide-plus"
						color="neutral"
						variant="outline"
						@click="showAddForm = true"
					/>
					<form
						v-else
						class="flex flex-col gap-2 rounded-md border border-default bg-default p-3"
						@submit.prevent="handleAddMember"
					>
						<UFormField label="Name">
							<UInput
								v-model="newMember.displayName"
								placeholder="Anzeigename"
								required
							/>
						</UFormField>
						<UFormField label="E-Mail">
							<UInput
								v-model="newMember.email"
								type="email"
								placeholder="email@schule.example"
							/>
						</UFormField>
						<UFormField label="Rolle">
							<USelectMenu
								:items="ROLE_OPTIONS"
								v-model="newMember.role"
								value-key="value"
								label-key="label"
							/>
						</UFormField>
						<div class="flex gap-2">
							<UButton type="submit" label="Hinzufügen" />
							<UButton
								label="Abbrechen"
								color="neutral"
								variant="ghost"
								@click="showAddForm = false"
							/>
						</div>
					</form>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
