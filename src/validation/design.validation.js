import { z } from "zod";

export const designStatusSchema = z.enum(["draft", "ready", "archived"]);

const nullablePathSchema = z.string().trim().min(1).max(1000).nullable();
const designDataSchema = z.object({}).catchall(z.unknown());

export const createDesignSchema = z
  .object({
    productId: z.string().uuid(),
    templateId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(200),
    designData: designDataSchema.default({}),
    previewPath: nullablePathSchema.optional(),
    sourceFilePath: nullablePathSchema.optional(),
    status: designStatusSchema.default("draft"),
  })
  .strict();

export const updateDesignSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    designData: designDataSchema,
    previewPath: nullablePathSchema,
    sourceFilePath: nullablePathSchema,
    status: designStatusSchema,
  })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one design field must be provided",
  });

export const designIdSchema = z.string().uuid();

export const listDesignsSchema = z
  .object({
    status: designStatusSchema.optional(),
    productId: z.string().uuid().optional(),
  })
  .strict();
