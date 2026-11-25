import test from "node:test";
import assert from "node:assert/strict";
import {
  createUserActivitySchema,
} from "../src/validation/user-activity.validation.js";
import { getClientIp } from "../src/utils/client-ip.js";

test("user activity input accepts coordinates and normalizes country codes", () => {
  assert.deepEqual(
    createUserActivitySchema.parse({
      activity: "product.viewed",
      location: {
        latitude: 22.5726,
        longitude: 88.3639,
        city: "Kolkata",
        countryCode: "in",
      },
    }),
    {
      activity: "product.viewed",
      location: {
        latitude: 22.5726,
        longitude: 88.3639,
        city: "Kolkata",
        countryCode: "IN",
      },
    },
  );
});

test("user activity input rejects spoofed ownership, IP, and incomplete location", () => {
  assert.throws(() =>
    createUserActivitySchema.parse({
      userId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.5",
      activity: "page_view",
      location: { city: "Kolkata" },
    }),
  );
  assert.throws(() =>
    createUserActivitySchema.parse({
      activity: "Page Viewed",
      location: { city: "Kolkata" },
    }),
  );
  assert.throws(() =>
    createUserActivitySchema.parse({
      activity: "page_view",
      location: { latitude: 22.5726 },
    }),
  );
  assert.throws(() =>
    createUserActivitySchema.parse({
      activity: "page_view",
      location: { timezone: "Asia/Calcutta" },
    }),
  );
});

test("client IP uses Express' resolved address and normalizes IPv4-mapped IPv6", () => {
  assert.equal(getClientIp({ ip: "::ffff:203.0.113.5" }), "203.0.113.5");
  assert.equal(
    getClientIp({ socket: { remoteAddress: "2001:db8::1" } }),
    "2001:db8::1",
  );
});
