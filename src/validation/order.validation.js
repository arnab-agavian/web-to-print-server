import { z } from "zod";

export const idSchema = z.string().uuid();

export const orderItemSchema = z
  .object({
    productSlug: z.string().trim().min(1).max(100),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    quantity: z.coerce.number().int().positive(),
    material: z.string().trim().min(1).max(200).default("standard"),
    materialMultiplier: z.coerce.number().min(0.5).max(3).default(1),
    designId: z.string().uuid().nullable().optional(),
    configuration: z.object({}).catchall(z.unknown()).default({}),
  })
  .strict();

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1).max(50),
    configuration: z.object({}).catchall(z.unknown()).default({}),
  })
  .strict();
