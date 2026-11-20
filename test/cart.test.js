import test from "node:test";
import assert from "node:assert/strict";
import {
  addCartItemSchema,
  updateCartItemSchema,
} from "../src/validation/cart.validation.js";
import { serializeCart } from "../src/services/cart.service.js";

test("cart item validation applies safe defaults", () => {
  const input = addCartItemSchema.parse({
    productSlug: "labels",
    width: 100,
    height: 100,
    quantity: 100,
  });
  assert.equal(input.material, "standard");
  assert.equal(input.materialMultiplier, 1);
  assert.deepEqual(input.configuration, {});
});

test("cart item update requires at least one valid field", () => {
  assert.throws(() => updateCartItemSchema.parse({}));
  assert.throws(() => updateCartItemSchema.parse({ quantity: 0 }));
  assert.deepEqual(updateCartItemSchema.parse({ quantity: 250 }), {
    quantity: 250,
  });
});

test("cart serialization calculates authoritative line and cart totals", () => {
  const cart = serializeCart({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    customerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdAt: new Date("2026-11-20T10:00:00.000Z"),
    updatedAt: new Date("2026-11-20T10:00:00.000Z"),
    items: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        quantity: 100,
        widthMm: 100,
        heightMm: 100,
        material: "Premium vinyl",
        materialMultiplier: 1,
        configuration: { finish: "gloss" },
        createdAt: new Date("2026-11-20T10:00:00.000Z"),
        updatedAt: new Date("2026-11-20T10:00:00.000Z"),
        product: {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "labels",
          name: "Labels & Stickers",
          family: "labels",
          active: true,
          basePrice: 1.8,
          minQuantity: 25,
          minWidth: 20,
          maxWidth: 500,
          minHeight: 20,
          maxHeight: 500,
        },
      },
    ],
  });

  assert.equal(cart.items[0].price.total, 178.18);
  assert.deepEqual(cart.summary, {
    currency: "INR",
    itemCount: 1,
    totalQuantity: 100,
    subtotal: 151,
    tax: 27.18,
    total: 178.18,
  });
});
