const tiers = [
  { minimum: 500, multiplier: 0.68 },
  { minimum: 250, multiplier: 0.76 },
  { minimum: 100, multiplier: 0.84 },
  { minimum: 50, multiplier: 0.92 },
  { minimum: 1, multiplier: 1 },
];

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculatePrice({
  product,
  width,
  height,
  quantity,
  materialMultiplier = 1,
  taxRate = 0.18,
}) {
  if (!product) throw new Error("Product is required");
  for (const [name, value] of Object.entries({
    width,
    height,
    quantity,
    materialMultiplier,
  })) {
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${name} must be a positive number`);
  }
  if (quantity < product.minQuantity)
    throw new Error(`Minimum quantity is ${product.minQuantity}`);
  if (
    width < product.minWidth ||
    width > product.maxWidth ||
    height < product.minHeight ||
    height > product.maxHeight
  )
    throw new Error("Dimensions are outside this product’s supported range");
  const areaFactor = Math.max(0.7, (width * height) / 10000);
  const tier = tiers.find((item) => quantity >= item.minimum);
  const unitPrice = round(
    product.basePrice * areaFactor * materialMultiplier * tier.multiplier,
  );
  const subtotal = round(unitPrice * quantity);
  const tax = round(subtotal * taxRate);
  return {
    currency: "INR",
    unitPrice,
    subtotal,
    tax,
    total: round(subtotal + tax),
    discountPercent: Math.round((1 - tier.multiplier) * 100),
    quantity,
    width,
    height,
  };
}
