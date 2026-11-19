import { z } from "zod";
export const priceSchema = z.object({
  productSlug: z.string().min(1),
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  materialMultiplier: z.coerce.number().min(0.5).max(3).default(1),
});
