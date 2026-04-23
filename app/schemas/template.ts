import { z } from 'zod'

export const SentencePartSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('text'), value: z.string() }),
	z.object({ type: z.literal('genderVariant'), value: z.tuple([z.string(), z.string()]) }),
	z.object({ type: z.literal('name'), value: z.string().optional() }),
])

export const VariantSchema = z.object({
	id: z.string().uuid(),
	label: z.string(),
	sentences: z.array(SentencePartSchema),
})

export const GradeSchema = z.object({
	id: z.string().uuid(),
	label: z.string(),
	variants: z.array(VariantSchema),
})

export const CategorySchema = z.object({
	id: z.string().uuid(),
	label: z.string(),
	grades: z.array(GradeSchema),
})

export const SubjectSchema = z.object({
	id: z.string().uuid(),
	label: z.string(),
	categories: z.array(CategorySchema),
})

export const TemplateSetSchema = z.object({
	id: z.string().uuid(),
	label: z.string(),
	subjects: z.array(SubjectSchema),
	_schemaVersion: z.number().optional(),
})

export const TemplateSetsRecordSchema = z.record(z.string().uuid(), TemplateSetSchema)

// Payload for exporting/importing templates as a single `.advzeu` file.
// Includes ordering metadata (`orderedIds`) so template UI stays stable.
export const AdvZeUExportPayloadSchema = z.object({
	schemaVersion: z.literal(1),
	orderedIds: z.array(z.string().uuid()),
	templateSets: TemplateSetsRecordSchema,
})

export type AdvZeUExportPayload = z.infer<typeof AdvZeUExportPayloadSchema>
