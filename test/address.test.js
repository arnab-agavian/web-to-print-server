import test from "node:test";
import assert from "node:assert/strict";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../src/validation/address.validation.js";

const validAddress = {
  recipientName: "Maya Brooks",
  phone: "+919876543210",
  addressLine1: "42 Park Street",
  city: "Kolkata",
  state: "West Bengal",
  postalCode: "700016",
};

test("address validation applies defaults and normalizes country codes", () => {
  const defaults = createAddressSchema.parse(validAddress);
  assert.equal(defaults.label, "Home");
  assert.equal(defaults.countryCode, "IN");
  assert.equal(defaults.isDefault, false);

  const international = createAddressSchema.parse({
    ...validAddress,
    countryCode: "gb",
  });
  assert.equal(international.countryCode, "GB");
});

test("address validation rejects invalid contact and postal data", () => {
  assert.throws(() =>
    createAddressSchema.parse({ ...validAddress, phone: "123" }),
  );
  assert.throws(() =>
    createAddressSchema.parse({ ...validAddress, postalCode: "@@@" }),
  );
});

test("address updates reject empty or unsupported changes", () => {
  assert.throws(() => updateAddressSchema.parse({}));
  assert.throws(() => updateAddressSchema.parse({ isDefault: true }));
  assert.deepEqual(updateAddressSchema.parse({ city: "Mumbai" }), {
    city: "Mumbai",
  });
});
