import { z } from "zod";
export const jobQuerySchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const customerQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();
export const statusSchema = z.object({
  status: z.enum([
    "quote",
    "order",
    "artwork",
    "proof",
    "production",
    "completed",
  ]),
});
