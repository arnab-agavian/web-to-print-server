import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { calculatePrice } from "./pricing.js";
import { getProduct } from "./product.service.js";

const cartInclude = {
  items: {
    include: { product: true },
    orderBy: { createdAt: "asc" },
  },
};

function requireDatabase() {
  if (!env.hasDatabase) {
    const error = new Error("Database is not configured. Cart operations require PostgreSQL.");
    error.status = 503;
    throw error;
  }
}

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function pricingProduct(product) {
  return {
    ...product,
    basePrice: Number(product.basePrice),
    minWidth: Number(product.minWidth),
    maxWidth: Number(product.maxWidth),
    minHeight: Number(product.minHeight),
    maxHeight: Number(product.maxHeight),
  };
}

export function serializeCart(cart, customerId = cart?.customerId ?? null) {
  const items = (cart?.items ?? []).map((item) => {
    const width = Number(item.widthMm);
    const height = Number(item.heightMm);
    const materialMultiplier = Number(item.materialMultiplier);
    const price = calculatePrice({
      product: pricingProduct(item.product),
      width,
      height,
      quantity: item.quantity,
      materialMultiplier,
    });

    return {
      id: item.id,
      product: {
        id: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        family: item.product.family,
        active: item.product.active,
      },
      quantity: item.quantity,
      width,
      height,
      material: item.material,
      materialMultiplier,
      configuration: item.configuration,
      price,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  return {
    id: cart?.id ?? null,
    customerId,
    items,
    summary: {
      currency: "INR",
      itemCount: items.length,
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: round(items.reduce((total, item) => total + item.price.subtotal, 0)),
      tax: round(items.reduce((total, item) => total + item.price.tax, 0)),
      total: round(items.reduce((total, item) => total + item.price.total, 0)),
    },
    createdAt: cart?.createdAt ?? null,
    updatedAt: cart?.updatedAt ?? null,
  };
}

async function loadCart(customerId) {
  return prisma.cart.findUnique({
    where: { customerId },
    include: cartInclude,
  });
}

export async function getCart(user) {
  requireDatabase();
  return serializeCart(await loadCart(user.id), user.id);
}

export async function addCartItem(input, user) {
  requireDatabase();
  const product = await getProduct(input.productSlug);
  if (!product) {
    const error = new Error("Product not found.");
    error.status = 404;
    throw error;
  }

  calculatePrice({ ...input, product });
  await prisma.$transaction(async (transaction) => {
    const cart = await transaction.cart.upsert({
      where: { customerId: user.id },
      update: {},
      create: { customerId: user.id },
    });
    await transaction.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: input.quantity,
        widthMm: input.width,
        heightMm: input.height,
        material: input.material,
        materialMultiplier: input.materialMultiplier,
        configuration: input.configuration,
      },
    });
  });

  return getCart(user);
}

export async function updateCartItem(id, input, user) {
  requireDatabase();
  const item = await prisma.cartItem.findFirst({
    where: { id, cart: { customerId: user.id } },
    include: { product: true },
  });
  if (!item) return null;

  const next = {
    quantity: input.quantity ?? item.quantity,
    width: input.width ?? Number(item.widthMm),
    height: input.height ?? Number(item.heightMm),
    material: input.material ?? item.material,
    materialMultiplier:
      input.materialMultiplier ?? Number(item.materialMultiplier),
    configuration: input.configuration ?? item.configuration,
  };
  calculatePrice({ product: pricingProduct(item.product), ...next });

  await prisma.cartItem.update({
    where: { id },
    data: {
      quantity: next.quantity,
      widthMm: next.width,
      heightMm: next.height,
      material: next.material,
      materialMultiplier: next.materialMultiplier,
      configuration: next.configuration,
    },
  });
  return getCart(user);
}

export async function removeCartItem(id, user) {
  requireDatabase();
  const deleted = await prisma.cartItem.deleteMany({
    where: { id, cart: { customerId: user.id } },
  });
  return deleted.count ? getCart(user) : null;
}

export async function clearCart(user) {
  requireDatabase();
  await prisma.cartItem.deleteMany({
    where: { cart: { customerId: user.id } },
  });
  return getCart(user);
}
