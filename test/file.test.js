import test from "node:test";
import assert from "node:assert/strict";
import {
  parseUploadReference,
  validateFileSignature,
} from "../src/services/file.service.js";
import {
  deleteFileSchema,
  refreshSignedUrlSchema,
  uploadMetadataSchema,
} from "../src/validation/file.validation.js";

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

test("signed URL refresh validation requires one path", () => {
  assert.deepEqual(refreshSignedUrlSchema.parse({ path: "user/artwork/file.png" }), {
    path: "user/artwork/file.png",
  });
  assert.throws(() => refreshSignedUrlSchema.parse({}));
  assert.throws(() =>
    refreshSignedUrlSchema.parse({ path: "user/file.png", bucket: "public" }),
  );
});

test("upload references accept permanent paths and Supabase URLs", () => {
  assert.deepEqual(
    parseUploadReference("customer-id/artwork/file.png"),
    {
      bucket: "uploads",
      path: "customer-id/artwork/file.png",
      ownerId: "customer-id",
    },
  );
  assert.deepEqual(
    parseUploadReference(
      "https://example.supabase.co/storage/v1/object/sign/uploads/customer-id/artwork/file.png?token=expired",
    ),
    {
      bucket: "uploads",
      path: "customer-id/artwork/file.png",
      ownerId: "customer-id",
    },
  );
  assert.deepEqual(
    parseUploadReference(
      "https://example.supabase.co/storage/v1/object/public/uploads/customer-id/artwork/file.png",
    ),
    {
      bucket: "uploads",
      path: "customer-id/artwork/file.png",
      ownerId: "customer-id",
    },
  );
});

test("upload references reject other buckets and unsafe paths", () => {
  assert.throws(() =>
    parseUploadReference(
      "https://example.supabase.co/storage/v1/object/sign/production/file.pdf?token=expired",
    ),
  );
  assert.throws(() => parseUploadReference("customer-id/../file.png"));
});

test("file deletion requires exactly one public URL", () => {
  const publicUrl =
    "https://example.supabase.co/storage/v1/object/public/uploads/customer-id/artwork/file.png";
  assert.deepEqual(deleteFileSchema.parse({ publicUrl }), { publicUrl });
  assert.throws(() => deleteFileSchema.parse({}));
  assert.throws(() => deleteFileSchema.parse({ publicUrl: "not-a-url" }));
  assert.throws(() => deleteFileSchema.parse({ publicUrl, path: "file.png" }));
});
