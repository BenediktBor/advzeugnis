import { z } from 'zod'

export const SentencePartSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('text'), value: z.string() }),
	z.object({ type: z.literal('genderVariant'), value: z.tuple([z.string(), z.string()]) }),
	z.object({ type: z.literal('name'), value: z.string().optional() }),
	z.object({
		type: z.literal('optionalText'),
		id: z.string().uuid(),
		value: z.string(),
		enabledByDefault: z.boolean(),
	}),
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

// Payload for exporting/importing all template sets as a single `.azset` file.
// Includes ordering metadata (`orderedIds`) so template UI stays stable.
export const AzSetExportPayloadSchema = z.object({
	schemaVersion: z.literal(1),
	orderedIds: z.array(z.string().uuid()),
	templateSets: TemplateSetsRecordSchema,
})

// Backwards-compatible alias while the old identifier is still referenced in a few places.
export const AdvZeUExportPayloadSchema = AzSetExportPayloadSchema

// Payload for exporting/importing a single subject as a `.azsubject` file.
export const AzSubjectExportPayloadSchema = z.object({
	schemaVersion: z.literal(1),
	subject: SubjectSchema,
})

export type AzSetExportPayload = z.infer<typeof AzSetExportPayloadSchema>
export type AdvZeUExportPayload = AzSetExportPayload
export type AzSubjectExportPayload = z.infer<typeof AzSubjectExportPayloadSchema>
