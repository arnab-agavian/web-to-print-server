import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesignSchema,
  listDesignsSchema,
  updateDesignSchema,
} from "../src/validation/design.validation.js";

const productId = "20520000-0000-4000-8000-000000000001";

test("design validation applies editor defaults", () => {
  const design = createDesignSchema.parse({
    productId,
    name: "Race board",
  });
  assert.deepEqual(design.designData, {});
  assert.equal(design.status, "draft");
});

test("design validation accepts editor data and uploaded file paths", () => {
  const design = createDesignSchema.parse({
    productId,
    templateId: null,
    name: "Race board",
    designData: { layers: [{ type: "text", value: "42" }] },
    previewPath: "uploads/customer/previews/race-board.png",
    sourceFilePath: null,
    status: "ready",
  });
  assert.equal(design.designData.layers[0].value, "42");
  assert.equal(design.status, "ready");
});

test("design updates reject immutable and unsupported fields", () => {
  assert.throws(() => updateDesignSchema.parse({}));
  assert.throws(() => updateDesignSchema.parse({ productId }));
  assert.throws(() => updateDesignSchema.parse({ status: "deleted" }));
  assert.deepEqual(updateDesignSchema.parse({ status: "archived" }), {
    status: "archived",
  });
});

test("design list filters are strict", () => {
  assert.deepEqual(listDesignsSchema.parse({ status: "draft", productId }), {
    status: "draft",
    productId,
  });
  assert.throws(() => listDesignsSchema.parse({ customerId: productId }));
});
