import { z } from "zod";

const configurableItemFields = {
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  material: z.string().trim().min(1).max(200),
  materialMultiplier: z.coerce.number().min(0.5).max(3),
  configuration: z.object({}).catchall(z.unknown()),
};

export const addCartItemSchema = z
  .object({
    productSlug: z.string().trim().min(1).max(100),
    width: configurableItemFields.width,
    height: configurableItemFields.height,
    quantity: configurableItemFields.quantity,
    material: configurableItemFields.material.default("standard"),
    materialMultiplier: configurableItemFields.materialMultiplier.default(1),
    configuration: configurableItemFields.configuration.default({}),
  })
  .strict();

export const updateCartItemSchema = z
  .object(configurableItemFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one cart item field must be provided",
  });

export const cartItemIdSchema = z.string().uuid();
