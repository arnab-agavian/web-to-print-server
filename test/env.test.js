import test from "node:test";
import assert from "node:assert/strict";
import { parseCorsOrigins } from "../src/config/env.js";

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
