import { z } from "zod";

export const uploadCategories = [
  "general",
  "products",
  "templates",
  "artwork",
  "proofs",
];

export const uploadMetadataSchema = z
  .object({
    category: z.enum(uploadCategories).default("general"),
  })
  .strict();
