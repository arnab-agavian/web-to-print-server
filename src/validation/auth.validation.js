import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);

export const signupSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email,
  password,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
