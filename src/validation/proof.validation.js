import { z } from "zod";
export const createProofSchema = z.object({
  previewPath: z.string().min(1),
  notes: z.string().max(2000).optional(),
});
export const changeRequestSchema = z.object({
  message: z.string().min(5).max(2000),
});
