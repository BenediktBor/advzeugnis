import { z } from 'zod'

export const SchoolRoleSchema = z.enum(['admin', 'editor', 'teacher'])

export const CurrentUserSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	email: z.string().optional(),
	type: z.enum(['solo', 'school']),
	role: SchoolRoleSchema.optional(),
})

export const SchoolMemberSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	email: z.string().optional(),
	role: SchoolRoleSchema,
})

export const SchoolMembersArraySchema = z.array(SchoolMemberSchema)
