import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingRequiredPlaceholders,
  getPlaceholderLayers,
  getProductionItemDetails,
  isPdfRenderableImage,
} from "../src/utils/production.js";
import { findStoredProductionFile } from "../src/services/production-file.service.js";

test("production details expose template thumbnails and placeholders", () => {
  const [detail] = getProductionItemDetails({
    proofs: [{ previewPath: "proofs/order-1/approved.png" }],
    items: [
      {
        quantity: 25,
        widthMm: 240,
        heightMm: 180,
        material: "polypropylene",
        product: { name: "MTB Board" },
        design: {
          name: "Race board 42",
          previewPath: "artwork/order-1/preview.png",
          designData: { placeholders: { raceNumber: "42" } },
          template: {
            name: "Race template",
            thumbnailPath: "templates/race-template.png",
            placeholderRules: {
              raceNumber: { required: true, maxLength: 3 },
            },
          },
        },
      },
    ],
  });

  assert.equal(detail.thumbnailPath, "templates/race-template.png");
  assert.deepEqual(detail.placeholderValues, { raceNumber: "42" });
  assert.deepEqual(detail.placeholderRules, {
    raceNumber: { required: true, maxLength: 3 },
  });
  assert.equal(detail.approvedProofPath, "proofs/order-1/approved.png");
});

test("placeholder layers use configured positions and order-specific values", () => {
  const [placeholder] = getPlaceholderLayers({
    canvasWidth: 240,
    canvasHeight: 180,
    safeArea: { x: 10, y: 10, width: 220, height: 160 },
    placeholderRules: {
      raceNumber: {
        required: true,
        x: 50,
        y: 40,
        width: 140,
        height: 60,
        fontSize: 42,
        color: "#ffffff",
        align: "center",
      },
    },
    placeholderValues: { raceNumber: "108" },
  });
  assert.deepEqual(
    {
      key: placeholder.key,
      value: placeholder.value,
      x: placeholder.x,
      y: placeholder.y,
      width: placeholder.width,
      height: placeholder.height,
      fontSize: placeholder.fontSize,
      color: placeholder.color,
    },
    {
      key: "raceNumber",
      value: "108",
      x: 50,
      y: 40,
      width: 140,
      height: 60,
      fontSize: 42,
      color: "#ffffff",
    },
  );
});

test("required placeholders block production when order values are missing", () => {
  const details = [
    {
      line: 1,
      placeholderRules: { raceNumber: { required: true } },
      placeholderValues: {},
    },
  ];
  assert.deepEqual(getMissingRequiredPlaceholders(details), [
    "line 1: raceNumber",
  ]);
});

test("production backgrounds accept PNG and JPEG only", () => {
  assert.equal(
    isPdfRenderableImage(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ),
    true,
  );
  assert.equal(isPdfRenderableImage(Buffer.from([0xff, 0xd8, 0xff])), true);
  assert.equal(isPdfRenderableImage(Buffer.from("RIFF----WEBP")), false);
});

test("production renderer uses positions and values from saved design layers", () => {
  const [detail] = getProductionItemDetails({
    items: [
      {
        widthMm: 200,
        heightMm: 100,
        design: {
          designData: {
            layers: [
              {
                placeholder: "riderName",
                value: "Maya",
                x: 25,
                y: 30,
                width: 150,
                height: 20,
                fontSize: 24,
              },
            ],
          },
          template: {
            canvasWidth: 200,
            canvasHeight: 100,
            safeArea: { x: 10, y: 10, width: 180, height: 80 },
            placeholderRules: {
              placeholders: [{ key: "riderName", required: true }],
            },
          },
        },
      },
    ],
  });
  const [placeholder] = getPlaceholderLayers(detail);
  assert.equal(placeholder.value, "Maya");
  assert.equal(placeholder.x, 25);
  assert.equal(placeholder.y, 30);
  assert.equal(placeholder.width, 150);
  assert.equal(placeholder.fontSize, 24);
});

test("stored production lookup reuses the PDF for the approved proof", () => {
  const expected = {
    id: "file-2",
    proofId: "proof-2",
    kind: "pdf",
  };
  assert.equal(
    findStoredProductionFile(
      {
        productionFiles: [
          { id: "file-1", proofId: "proof-1", kind: "pdf" },
          expected,
        ],
      },
      "proof-2",
    ),
    expected,
  );
});

test("production details use safe empty placeholder defaults", () => {
  const [detail] = getProductionItemDetails({
    product_name: "Demo product",
    quantity: 1,
  });
  assert.equal(detail.productName, "Demo product");
  assert.equal(detail.thumbnailPath, null);
  assert.deepEqual(detail.placeholderValues, {});
  assert.deepEqual(detail.placeholderRules, {});
});
