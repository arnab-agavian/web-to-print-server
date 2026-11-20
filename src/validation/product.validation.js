import { z } from "zod";

export const productFamilies = [
  "labels",
  "race_numbers",
  "mtb_boards",
  "stamps",
  "trophies",
  "laser_cut",
];

export const priceSchema = z.object({
  productSlug: z.string().min(1),
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  materialMultiplier: z.coerce.number().min(0.5).max(3).default(1),
});

const productFields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and single hyphens only",
    ),
  name: z.string().trim().min(2).max(200),
  family: z.enum(productFamilies),
  description: z.string().trim().max(2000).nullable(),
  basePrice: z.coerce.number().positive(),
  minQuantity: z.coerce.number().int().positive(),
  minWidth: z.coerce.number().positive(),
  maxWidth: z.coerce.number().positive(),
  minHeight: z.coerce.number().positive(),
  maxHeight: z.coerce.number().positive(),
  defaultWidth: z.coerce.number().positive(),
  defaultHeight: z.coerce.number().positive(),
  bleedMm: z.coerce.number().nonnegative(),
  resolutionDpi: z.coerce.number().int().min(72).max(2400),
  configurationSchema: z.object({}).catchall(z.unknown()),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(-32768).max(32767),
};

function validateDimensions(product, context) {
    if (product.maxWidth < product.minWidth) {
      context.addIssue({
        code: "custom",
        path: ["maxWidth"],
        message: "maxWidth must be greater than or equal to minWidth",
      });
    }
    if (product.maxHeight < product.minHeight) {
      context.addIssue({
        code: "custom",
        path: ["maxHeight"],
        message: "maxHeight must be greater than or equal to minHeight",
      });
    }
    if (
      product.defaultWidth < product.minWidth ||
      product.defaultWidth > product.maxWidth
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultWidth"],
        message: "defaultWidth must be within the supported width range",
      });
    }
    if (
      product.defaultHeight < product.minHeight ||
      product.defaultHeight > product.maxHeight
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultHeight"],
        message: "defaultHeight must be within the supported height range",
      });
    }
}

export const createProductSchema = z
  .object({
    ...productFields,
    description: productFields.description.optional(),
    minQuantity: productFields.minQuantity.default(1),
    bleedMm: productFields.bleedMm.default(3),
    resolutionDpi: productFields.resolutionDpi.default(300),
    configurationSchema: productFields.configurationSchema.default({}),
    active: productFields.active.default(true),
    sortOrder: productFields.sortOrder.default(0),
  })
  .strict()
  .superRefine(validateDimensions);

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one product field must be provided",
  });
