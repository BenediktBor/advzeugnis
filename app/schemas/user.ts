import { z } from 'zod'

export const SchoolRoleSchema = z.enum(['admin', 'templateManager', 'teacher'])

export const CurrentUserSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	email: z.string().optional(),
	type: z.enum(['solo', 'school']),
	role: SchoolRoleSchema.optional(),
	schoolId: z.string().optional(),
	schoolName: z.string().optional(),
})

export const SchoolMemberSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	email: z.string().optional(),
	role: SchoolRoleSchema,
	membershipId: z.string().optional(),
})

export const SchoolMembersArraySchema = z.array(SchoolMemberSchema)
