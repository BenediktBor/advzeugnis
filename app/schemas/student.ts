import { z } from 'zod'

export const ReportSelectionSchema = z.object({
	categories: z.record(
		z.string(),
		z.object({
			gradeId: z.string().nullable(),
			variantIds: z.array(z.string()),
			optionalPartOverrides: z.record(z.string(), z.boolean()).optional(),
		})
	),
})

export const StudentSchema = z.object({
	id: z.string(),
	name: z.string(),
	surname: z.string(),
	gender: z.enum(['male', 'female']),
	templateSetId: z.string(),
	reportSelection: ReportSelectionSchema.optional(),
})

export const StudentsArraySchema = z.array(StudentSchema)
