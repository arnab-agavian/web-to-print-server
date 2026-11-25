import { z } from "zod";

const optionalText = (max) => z.string().trim().min(1).max(max).optional();

export const userLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    accuracy: z.number().finite().min(0).max(100_000).optional(),
    city: optionalText(100),
    region: optionalText(100),
    country: optionalText(100),
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Must be a two-letter country code.")
      .transform((value) => value.toUpperCase())
      .optional(),
    timezone: optionalText(100),
  })
  .strict()
  .superRefine((location, context) => {
    const hasLatitude = location.latitude !== undefined;
    const hasLongitude = location.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        path: [hasLatitude ? "longitude" : "latitude"],
        message: "Latitude and longitude must be provided together.",
      });
    }

    if (
      !hasLatitude &&
      !location.city &&
      !location.region &&
      !location.country &&
      !location.countryCode
    ) {
      context.addIssue({
        code: "custom",
        message: "Provide coordinates or at least one named location field.",
      });
    }
  });

const activityName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[a-z][a-z0-9_.:-]*$/,
    "Use a lowercase activity name such as page_view or order.created.",
  );

export const createUserActivitySchema = z
  .object({
    activity: activityName,
    location: userLocationSchema,
  })
  .strict();
