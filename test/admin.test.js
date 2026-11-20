import test from "node:test";
import assert from "node:assert/strict";
import { customerQuerySchema } from "../src/validation/admin.validation.js";

test("customer list query applies pagination defaults", () => {
  assert.deepEqual(customerQuerySchema.parse({}), {
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(
    customerQuerySchema.parse({ q: "  maya  ", limit: "20", offset: "10" }),
    { q: "maya", limit: 20, offset: 10 },
  );
});

test("customer list query rejects unsafe pagination and unknown filters", () => {
  assert.throws(() => customerQuerySchema.parse({ limit: 0 }));
  assert.throws(() => customerQuerySchema.parse({ limit: 101 }));
  assert.throws(() => customerQuerySchema.parse({ offset: -1 }));
  assert.throws(() => customerQuerySchema.parse({ role: "admin" }));
});
