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

export const refreshSignedUrlSchema = z
  .object({
    path: z.string().trim().min(1).max(4000),
  })
  .strict();

export const deleteFileSchema = z
  .object({
    publicUrl: z.string().trim().max(4000).url(),
  })
  .strict();
