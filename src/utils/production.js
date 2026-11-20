const first = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
};

const objectValue = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const numericValue = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function valuesFromLayers(layers) {
  if (!Array.isArray(layers)) return {};
  return Object.fromEntries(
    layers
      .filter((layer) => layer && typeof layer === "object")
      .map((layer) => [
        layer.placeholder || layer.name || layer.key || layer.id,
        layer.value ?? layer.text,
      ])
      .filter(([key, value]) => key && value !== undefined && value !== null),
  );
}

function layerKey(layer) {
  return layer?.placeholder || layer?.name || layer?.key || layer?.id;
}

function placeholderEntries(rawRules) {
  if (Array.isArray(rawRules)) {
    return rawRules.map((rule, index) => [layerKey(rule) || `placeholder_${index + 1}`, rule]);
  }
  const rules = objectValue(rawRules);
  const nested = rules.placeholders ?? rules.layers;
  if (Array.isArray(nested)) {
    return nested.map((rule, index) => [layerKey(rule) || `placeholder_${index + 1}`, rule]);
  }
  if (nested && typeof nested === "object") return Object.entries(nested);
  return Object.entries(rules);
}

export function getProductionItemDetails(order) {
  const items = order?.items?.length ? order.items : [order];
  const approvedProof = order?.proofs?.[0];

  return items.map((item, index) => {
    const design = item?.design || null;
    const template = design?.template || null;
    const designData = objectValue(first(design, "designData", "design_data"));
    const orderConfiguration = objectValue(order?.configuration);
    const itemConfiguration = objectValue(item?.configuration);
    const rawPlaceholderRules = first(
      template,
      "placeholderRules",
      "placeholder_rules",
    );
    const placeholderRules = Array.isArray(rawPlaceholderRules)
      ? rawPlaceholderRules
      : objectValue(rawPlaceholderRules);
    const directValues = Object.fromEntries(
      placeholderEntries(placeholderRules)
        .map(([key]) => key)
        .map((key) => [
          key,
          designData[key] ?? itemConfiguration[key] ?? orderConfiguration[key],
        ])
        .filter(([, value]) => value !== undefined && value !== null),
    );
    const placeholderValues = {
      ...objectValue(orderConfiguration.placeholders),
      ...objectValue(itemConfiguration.placeholders),
      ...directValues,
      ...valuesFromLayers(designData.layers),
      ...objectValue(designData.variables),
      ...objectValue(designData.placeholderValues),
      ...objectValue(designData.placeholders),
    };
    const canvasWidth = numericValue(
      first(template, "canvasWidth", "canvas_width"),
      numericValue(first(item, "widthMm", "width_mm"), 210),
    );
    const canvasHeight = numericValue(
      first(template, "canvasHeight", "canvas_height"),
      numericValue(first(item, "heightMm", "height_mm"), 297),
    );

    return {
      line: index + 1,
      productName:
        item?.product?.name || order?.product_name || "Custom print job",
      quantity: first(item, "quantity") || 0,
      widthMm: first(item, "widthMm", "width_mm"),
      heightMm: first(item, "heightMm", "height_mm"),
      material: first(item, "material"),
      designId: first(design, "id"),
      designName: first(design, "name"),
      designPreviewPath: first(design, "previewPath", "preview_path"),
      approvedProofPath: first(approvedProof, "previewPath", "preview_path"),
      templateName: first(template, "name"),
      templateId: first(template, "id"),
      canvasWidth,
      canvasHeight,
      safeArea: objectValue(first(template, "safeArea", "safe_area")),
      thumbnailPath: first(template, "thumbnailPath", "thumbnail_path"),
      designLayers: Array.isArray(designData.layers) ? designData.layers : [],
      placeholderRules,
      placeholderValues,
    };
  });
}

export function getPlaceholderLayers(detail) {
  const rules = detail?.placeholderRules ?? {};
  const values = objectValue(detail?.placeholderValues);
  const configuredEntries = placeholderEntries(rules);
  const entries = configuredEntries.length
    ? configuredEntries
    : Object.keys(values).map((key) => [key, {}]);
  const designLayers = Array.isArray(detail?.designLayers)
    ? detail.designLayers
    : [];
  const canvasWidth = numericValue(detail?.canvasWidth, 210);
  const canvasHeight = numericValue(detail?.canvasHeight, 297);
  const safeArea = {
    x: numericValue(detail?.safeArea?.x, 0),
    y: numericValue(detail?.safeArea?.y, 0),
    width: numericValue(detail?.safeArea?.width, canvasWidth),
    height: numericValue(detail?.safeArea?.height, canvasHeight),
  };
  const fallbackHeight = Math.max(
    8,
    safeArea.height / Math.max(entries.length, 1),
  );

  return entries.map(([key, rawRule], index) => {
    const rule = objectValue(rawRule);
    const designLayer =
      designLayers.find((layer) => layerKey(layer) === key) || {};
    const position = {
      ...objectValue(designLayer.position),
      ...objectValue(rule.position),
    };
    const value =
      values[key] ??
      rule.value ??
      designLayer.value ??
      designLayer.text ??
      rule.defaultValue ??
      rule.default ??
      "";
    return {
      key,
      value: value === null || value === undefined ? "" : String(value),
      required: Boolean(rule.required),
      x: numericValue(rule.x ?? position.x ?? designLayer.x, safeArea.x),
      y: numericValue(
        rule.y ?? position.y ?? designLayer.y,
        safeArea.y + index * fallbackHeight,
      ),
      width: numericValue(
        rule.width ?? position.width ?? designLayer.width,
        safeArea.width,
      ),
      height: numericValue(
        rule.height ?? position.height ?? designLayer.height,
        fallbackHeight,
      ),
      fontSize: numericValue(
        rule.fontSize ?? rule.font_size ?? designLayer.fontSize,
        18,
      ),
      color:
        typeof (rule.color ?? designLayer.color) === "string"
          ? rule.color ?? designLayer.color
          : "#111111",
      align: ["left", "center", "right", "justify"].includes(
        rule.align ?? designLayer.align,
      )
        ? rule.align ?? designLayer.align
        : "center",
      font:
        typeof (rule.font ?? designLayer.font) === "string"
          ? rule.font ?? designLayer.font
          : "Helvetica",
      rotate: numericValue(
        rule.rotate ?? rule.rotation ?? designLayer.rotate ?? designLayer.rotation,
        0,
      ),
    };
  });
}

export function getMissingRequiredPlaceholders(details) {
  return details.flatMap((detail) =>
    getPlaceholderLayers(detail)
      .filter((placeholder) => placeholder.required && !placeholder.value.trim())
      .map((placeholder) => `line ${detail.line}: ${placeholder.key}`),
  );
}

export function isPdfRenderableImage(buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  const png =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  return png || jpeg;
}
