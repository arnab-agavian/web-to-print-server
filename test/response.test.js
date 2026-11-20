import test from "node:test";
import assert from "node:assert/strict";
import { jsonReplacer } from "../src/utils/response.js";

test("JSON responses serialize Prisma BigInt fields as decimal strings", () => {
  const createdAt = new Date("2026-11-20T10:00:00.000Z");
  const result = JSON.parse(
    JSON.stringify(
      {
        event: { id: 42n, createdAt },
        productionFile: { sizeBytes: 9007199254740993n },
      },
      jsonReplacer,
    ),
  );

  assert.equal(result.event.id, "42");
  assert.equal(result.event.createdAt, createdAt.toISOString());
  assert.equal(result.productionFile.sizeBytes, "9007199254740993");
});
