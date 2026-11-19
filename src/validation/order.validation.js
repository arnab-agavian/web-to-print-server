import { z } from "zod";
export const idSchema = z.string().uuid();
export const createOrderSchema = z.object({
  productSlug: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  quantity: z.number().int().positive(),
  material: z.string().min(1).default("standard"),
  materialMultiplier: z.number().min(0.5).max(3).default(1),
  designId: z.string().uuid().optional(),
  configuration: z.record(z.string(), z.unknown()).default({}),
});
