import test from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../src/data/catalog.js";
import { priceOrderItems } from "../src/services/order.service.js";
import { createOrderSchema } from "../src/validation/order.validation.js";

test("order validation accepts multiple products and applies line defaults", () => {
  const input = createOrderSchema.parse({
    items: [
      { productSlug: "labels", width: 100, height: 100, quantity: 100 },
      { productSlug: "stamps", width: 70, height: 35, quantity: 2 },
    ],
    configuration: { delivery: "standard" },
  });

  assert.equal(input.items.length, 2);
  assert.equal(input.items[0].material, "standard");
  assert.equal(input.items[0].materialMultiplier, 1);
  assert.deepEqual(input.items[0].configuration, {});
  assert.deepEqual(input.configuration, { delivery: "standard" });
});

test("order validation requires a non-empty items array", () => {
  assert.throws(() => createOrderSchema.parse({ items: [] }));
  assert.throws(() =>
    createOrderSchema.parse({
      productSlug: "labels",
      width: 100,
      height: 100,
      quantity: 100,
    }),
  );
});

test("order pricing aggregates every product line", () => {
  const price = priceOrderItems([
    {
      product: catalog[0],
      productSlug: catalog[0].slug,
      width: 100,
      height: 100,
      quantity: 100,
      material: "Premium vinyl",
      materialMultiplier: 1,
      configuration: {},
    },
    {
      product: catalog[3],
      productSlug: catalog[3].slug,
      width: 70,
      height: 35,
      quantity: 2,
      material: "Rubber + ink",
      materialMultiplier: 1,
      configuration: {},
    },
  ]);

  assert.equal(price.itemCount, 2);
  assert.equal(price.totalQuantity, 102);
  assert.equal(price.items.length, 2);
  assert.equal(price.subtotal, 190.2);
  assert.equal(price.tax, 34.24);
  assert.equal(price.total, 224.44);
});
