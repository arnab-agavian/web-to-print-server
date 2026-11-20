import { z } from "zod";

const addressFields = {
  label: z.string().trim().min(1).max(50),
  recipientName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid international phone number"),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).nullable(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*[A-Za-z0-9]$/, "Enter a valid postal code"),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code")),
};

export const createAddressSchema = z
  .object({
    label: addressFields.label.default("Home"),
    recipientName: addressFields.recipientName,
    phone: addressFields.phone,
    addressLine1: addressFields.addressLine1,
    addressLine2: addressFields.addressLine2.optional(),
    city: addressFields.city,
    state: addressFields.state,
    postalCode: addressFields.postalCode,
    countryCode: addressFields.countryCode.default("IN"),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one address field must be provided",
  });

export const addressIdSchema = z.string().uuid();
