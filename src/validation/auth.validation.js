import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);

export const signupSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number."),
  role: z.literal("customer"),
});

export const loginSchema = z.object({
  email,
  password,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
