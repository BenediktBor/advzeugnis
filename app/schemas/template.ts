import { z } from 'zod'
import { migrateLegacyOptionalTextInput } from '~/utils/templateMigration'
import type { Category, Grade, Subject, TemplateSet, Variant } from '~/types/template'

export type AzSetExportPayload = {
	schemaVersion: 1
	orderedIds: string[]
	templateSets: Record<string, TemplateSet>
}
export type AdvZeUExportPayload = AzSetExportPayload
export type AzSubjectExportPayload = {
	schemaVersion: 1
	subject: Subject
}

const TextSentencePartSchema = z.object({ type: z.literal('text'), value: z.string() })
const GenderVariantSentencePartSchema = z.object({ type: z.literal('genderVariant'), value: z.tuple([z.string(), z.string()]) })
const NameSentencePartSchema = z.object({ type: z.literal('name'), value: z.string().optional() })

export const OptionalGroupChildPartSchema = z.discriminatedUnion('type', [
	TextSentencePartSchema,
	GenderVariantSentencePartSchema,
	NameSentencePartSchema,
])

export const SentencePartSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('text'), value: z.string() }),
	z.object({ type: z.literal('genderVariant'), value: z.tuple([z.string(), z.string()]) }),
	z.object({ type: z.literal('name'), value: z.string().optional() }),
	z.object({
		type: z.literal('optionalGroup'),
		id: z.string().uuid(),
		enabledByDefault: z.boolean(),
		parts: z.array(OptionalGroupChildPartSchema),
	}),
])

export const VariantSchema: z.ZodType<Variant, z.ZodTypeDef, unknown> = z.preprocess(migrateLegacyOptionalTextInput, z.object({
	id: z.string().uuid(),
	label: z.string(),
	sentences: z.array(SentencePartSchema),
}))

export const GradeSchema: z.ZodType<Grade, z.ZodTypeDef, unknown> = z.preprocess(migrateLegacyOptionalTextInput, z.object({
	id: z.string().uuid(),
	label: z.string(),
	value: z.number().finite().optional(),
	variants: z.array(VariantSchema),
}))

export const CategorySchema: z.ZodType<Category, z.ZodTypeDef, unknown> = z.preprocess(migrateLegacyOptionalTextInput, z.object({
	id: z.string().uuid(),
	label: z.string(),
	grades: z.array(GradeSchema),
}))

export const SubjectSchema: z.ZodType<Subject, z.ZodTypeDef, unknown> = z.preprocess(migrateLegacyOptionalTextInput, z.object({
	id: z.string().uuid(),
	label: z.string(),
	categories: z.array(CategorySchema),
	hidden: z.boolean().optional(),
}))

export const TemplateSetSchema: z.ZodType<TemplateSet, z.ZodTypeDef, unknown> = z.preprocess(migrateLegacyOptionalTextInput, z.object({
	id: z.string().uuid(),
	label: z.string(),
	subjects: z.array(SubjectSchema),
	hidden: z.boolean().optional(),
	_schemaVersion: z.number().optional(),
}))

export const TemplateSetsRecordSchema = z.record(z.string().uuid(), TemplateSetSchema)

export const TemplateClipboardPayloadSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('subject'),
		items: z.array(SubjectSchema),
		copiedAt: z.number().finite(),
		sourceLabel: z.string().optional(),
	}),
	z.object({
		kind: z.literal('category'),
		items: z.array(CategorySchema),
		copiedAt: z.number().finite(),
		sourceLabel: z.string().optional(),
	}),
	z.object({
		kind: z.literal('grade'),
		items: z.array(GradeSchema),
		copiedAt: z.number().finite(),
		sourceLabel: z.string().optional(),
	}),
	z.object({
		kind: z.literal('variant'),
		items: z.array(VariantSchema),
		copiedAt: z.number().finite(),
		sourceLabel: z.string().optional(),
	}),
	z.object({
		kind: z.literal('sentencePart'),
		items: z.array(SentencePartSchema),
		copiedAt: z.number().finite(),
		sourceLabel: z.string().optional(),
	}),
])

// Payload for exporting/importing all template sets as a single `.azset` file.
// Includes ordering metadata (`orderedIds`) so template UI stays stable.
export const AzSetExportPayloadSchema: z.ZodType<AzSetExportPayload, z.ZodTypeDef, unknown> = z.object({
	schemaVersion: z.literal(1),
	orderedIds: z.array(z.string().uuid()),
	templateSets: TemplateSetsRecordSchema,
})

// Backwards-compatible alias while the old identifier is still referenced in a few places.
export const AdvZeUExportPayloadSchema = AzSetExportPayloadSchema

// Payload for exporting/importing a single subject as a `.azsubject` file.
export const AzSubjectExportPayloadSchema: z.ZodType<AzSubjectExportPayload, z.ZodTypeDef, unknown> = z.object({
	schemaVersion: z.literal(1),
	subject: SubjectSchema,
})

export type TemplateClipboardPayloadInput = z.infer<typeof TemplateClipboardPayloadSchema>
