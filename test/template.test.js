import test from "node:test";
import assert from "node:assert/strict";
import {
  createTemplateSchema,
  updateTemplateSchema,
} from "../src/validation/template.validation.js";

const validTemplate = {
  name: "MTB Board 240 × 180",
  canvasWidth: 240,
  canvasHeight: 180,
  safeArea: { x: 10, y: 10, width: 220, height: 160 },
};

test("template validation applies defaults", () => {
  const template = createTemplateSchema.parse(validTemplate);
  assert.equal(template.safeArea.unit, "mm");
  assert.deepEqual(template.placeholderRules, {});
  assert.equal(template.active, true);
});

test("template validation rejects safe areas outside the canvas", () => {
  assert.throws(() =>
    createTemplateSchema.parse({
      ...validTemplate,
      safeArea: { x: 20, y: 10, width: 230, height: 160 },
    }),
  );
});

test("template update validation accepts partial changes", () => {
  assert.deepEqual(updateTemplateSchema.parse({ active: false }), {
    active: false,
  });
  assert.throws(() => updateTemplateSchema.parse({}));
  assert.throws(() => updateTemplateSchema.parse({ productId: "invalid" }));
});
