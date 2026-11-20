import test from "node:test";
import assert from "node:assert/strict";
import { validateFileSignature } from "../src/services/file.service.js";
import { uploadMetadataSchema } from "../src/validation/file.validation.js";

test("upload metadata defaults to the general category", () => {
  assert.deepEqual(uploadMetadataSchema.parse({}), { category: "general" });
  assert.throws(() => uploadMetadataSchema.parse({ category: "unknown" }));
});

test("file validation accepts supported signatures", () => {
  assert.equal(
    validateFileSignature({
      mimetype: "image/png",
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    }),
    "png",
  );
  assert.equal(
    validateFileSignature({
      mimetype: "application/pdf",
      buffer: Buffer.from("%PDF-1.7"),
    }),
    "pdf",
  );
});

test("file validation rejects MIME and content mismatches", () => {
  assert.throws(() =>
    validateFileSignature({
      mimetype: "image/png",
      buffer: Buffer.from("not an image"),
    }),
  );
  assert.throws(() =>
    validateFileSignature({
      mimetype: "application/octet-stream",
      buffer: Buffer.from("unknown"),
    }),
  );
});
