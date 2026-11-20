import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductSchema,
  updateProductSchema,
} from "../src/validation/product.validation.js";
import { normalizeProduct } from "../src/services/product.service.js";

const validProduct = {
  slug: "  EVENT-BANNERS  ",
  name: "Event Banners",
  family: "labels",
  basePrice: 25,
  minQuantity: 1,
  minWidth: 100,
  maxWidth: 2000,
  minHeight: 100,
  maxHeight: 1000,
  defaultWidth: 1000,
  defaultHeight: 500,
};

test("product creation validation normalizes the slug and applies defaults", () => {
  const product = createProductSchema.parse(validProduct);
  assert.equal(product.slug, "event-banners");
  assert.equal(product.bleedMm, 3);
  assert.equal(product.resolutionDpi, 300);
  assert.equal(product.active, true);
  assert.deepEqual(product.configurationSchema, {});
});

test("product creation validation enforces supported dimensions", () => {
  assert.throws(() =>
    createProductSchema.parse({
      ...validProduct,
      defaultWidth: 2500,
      maxHeight: 50,
    }),
  );
});

test("product creation validation rejects unknown database families", () => {
  assert.throws(() =>
    createProductSchema.parse({ ...validProduct, family: "banners" }),
  );
});

test("product update validation accepts partial changes and normalizes slugs", () => {
  assert.deepEqual(
    updateProductSchema.parse({ slug: "  PREMIUM-LABELS ", basePrice: 2.5 }),
    { slug: "premium-labels", basePrice: 2.5 },
  );
});

test("product update validation rejects empty and unknown changes", () => {
  assert.throws(() => updateProductSchema.parse({}));
  assert.throws(() => updateProductSchema.parse({ unknown: true }));
});

test("product responses project relational templates under configurationSchema", () => {
  const product = normalizeProduct({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "mtb-boards",
    basePrice: 12,
    minWidth: 150,
    maxWidth: 500,
    minHeight: 100,
    maxHeight: 400,
    defaultWidth: 240,
    defaultHeight: 180,
    bleedMm: 3,
    configurationSchema: { materials: ["polypropylene"], templates: ["stale"] },
    templates: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        canvasWidth: 240,
        canvasHeight: 180,
        name: "MTB Board 240 × 180",
      },
    ],
  });

  assert.deepEqual(product.configurationSchema.materials, ["polypropylene"]);
  assert.equal(product.configurationSchema.templates.length, 1);
  assert.equal(product.configurationSchema.templates[0].canvasWidth, 240);
  assert.equal(product.configurationSchema.templates[0].name, "MTB Board 240 × 180");
});
