import test from "node:test";
import assert from "node:assert/strict";
import { parseCorsOrigins, parseTrustProxy } from "../src/config/env.js";

test("CORS origins are normalized without trailing slashes or paths", () => {
  assert.deepEqual(
    parseCorsOrigins(
      " http://localhost:3000/, https://web-to-print-admin-app.vercel.app/ ",
    ),
    [
      "http://localhost:3000",
      "https://web-to-print-admin-app.vercel.app",
    ],
  );
});

test("CORS origin parsing removes blanks and duplicates", () => {
  assert.deepEqual(
    parseCorsOrigins(
      "https://example.com,https://example.com/, ,https://example.com/admin",
    ),
    ["https://example.com"],
  );
});

test("proxy trust parsing is explicit and supports hop counts or address lists", () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy("false"), false);
  assert.equal(parseTrustProxy("true"), true);
  assert.equal(parseTrustProxy("1"), 1);
  assert.deepEqual(parseTrustProxy("loopback, 10.0.0.0/8"), [
    "loopback",
    "10.0.0.0/8",
  ]);
});
