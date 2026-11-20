import { z } from "zod";

const safeAreaSchema = z
  .object({
    x: z.coerce.number().nonnegative(),
    y: z.coerce.number().nonnegative(),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    unit: z.enum(["mm"]).default("mm"),
  })
  .strict();

const templateFields = {
  name: z.string().trim().min(2).max(200),
  canvasWidth: z.coerce.number().positive(),
  canvasHeight: z.coerce.number().positive(),
  safeArea: safeAreaSchema,
  placeholderRules: z.object({}).catchall(z.unknown()),
  thumbnailPath: z.string().trim().min(1).max(1000).nullable(),
  active: z.boolean(),
};

function validateSafeArea(template, context) {
  if (template.safeArea.x + template.safeArea.width > template.canvasWidth) {
    context.addIssue({
      code: "custom",
      path: ["safeArea", "width"],
      message: "Safe area exceeds the canvas width",
    });
  }
  if (template.safeArea.y + template.safeArea.height > template.canvasHeight) {
    context.addIssue({
      code: "custom",
      path: ["safeArea", "height"],
      message: "Safe area exceeds the canvas height",
    });
  }
}

export const createTemplateSchema = z
  .object({
    ...templateFields,
    placeholderRules: templateFields.placeholderRules.default({}),
    thumbnailPath: templateFields.thumbnailPath.optional(),
    active: templateFields.active.default(true),
  })
  .strict()
  .superRefine(validateSafeArea);

export const updateTemplateSchema = z
  .object(templateFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one template field must be provided",
  });

export const templateIdSchema = z.string().uuid();
