import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { catalog } from "../data/catalog.js";
import { demoOrders } from "../data/demoStore.js";
import { normalizeProduct } from "./product.service.js";
import { calculatePrice } from "./pricing.js";
import { notifyOrderPlaced } from "./notification.service.js";

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, slug: true, name: true, family: true } },
      design: true,
    },
    orderBy: { createdAt: "asc" },
  },
  proofs: { orderBy: { version: "desc" } },
  events: { orderBy: { createdAt: "desc" } },
};

const round = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const orderNumber = () => `DH-${String(Date.now()).slice(-6)}`;

function serviceError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function priceOrderItems(items) {
  const lines = items.map(({ product, ...item }, index) => ({
    index,
    productId: product.id,
    productSlug: product.slug,
    ...calculatePrice({ ...item, product }),
  }));

  return {
    currency: "INR",
    itemCount: lines.length,
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    subtotal: round(
      lines.reduce((total, line) => total + line.subtotal, 0),
    ),
    tax: round(lines.reduce((total, line) => total + line.tax, 0)),
    total: round(lines.reduce((total, line) => total + line.total, 0)),
    items: lines,
  };
}

async function loadProducts(items) {
  const slugs = [...new Set(items.map((item) => item.productSlug))];
  if (!env.hasDatabase) {
    return new Map(
      slugs.map((slug) => [
        slug,
        catalog.find((product) => product.slug === slug) ?? null,
      ]),
    );
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, active: true },
  });
  const productsBySlug = new Map(
    products.map((product) => {
      const normalized = normalizeProduct(product);
      return [normalized.slug, normalized];
    }),
  );
  return new Map(
    slugs.map((slug) => [slug, productsBySlug.get(slug) ?? null]),
  );
}

async function prepareItems(input, user) {
  const products = await loadProducts(input.items);
  const missingSlug = [...products].find(([, product]) => !product)?.[0];
  if (missingSlug) {
    throw serviceError(`Product "${missingSlug}" not found.`, 404);
  }

  const prepared = input.items.map((item) => ({
    ...item,
    product: products.get(item.productSlug),
  }));

  if (env.hasDatabase) {
    const designIds = [
      ...new Set(prepared.map((item) => item.designId).filter(Boolean)),
    ];
    if (designIds.length) {
      const designs = await prisma.design.findMany({
        where: {
          id: { in: designIds },
          customerId: user.id,
          status: { not: "archived" },
        },
        select: { id: true, productId: true },
      });
      const designsById = new Map(designs.map((design) => [design.id, design]));

      for (const item of prepared) {
        if (!item.designId) continue;
        const design = designsById.get(item.designId);
        if (!design) {
          throw serviceError(
            `Design "${item.designId}" was not found, is archived, or is not owned by the customer.`,
            400,
          );
        }
        if (design.productId !== item.product.id) {
          throw serviceError(
            `Design "${item.designId}" does not belong to product "${item.productSlug}".`,
            400,
          );
        }
      }
    }
  } else if (prepared.some((item) => item.designId)) {
    throw serviceError(
      "Design references require a configured database.",
      503,
    );
  }

  let price;
  try {
    price = priceOrderItems(prepared);
  } catch (error) {
    if (!error.status) error.status = 400;
    throw error;
  }
  return { prepared, price };
}

export async function listOrders(user) {
  if (!env.hasDatabase)
    return demoOrders.filter(
      (order) => user.role === "admin" || order.customer_id === user.id,
    );
  return prisma.order.findMany({
    where: user.role === "admin" ? {} : { customerId: user.id },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrder(id, user) {
  if (!env.hasDatabase)
    return (
      demoOrders.find(
        (order) =>
          order.id === id &&
          (user.role === "admin" || order.customer_id === user.id),
      ) || null
    );
  return prisma.order.findFirst({
    where: { id, ...(user.role === "admin" ? {} : { customerId: user.id }) },
    include: { ...orderInclude, productionFiles: user.role === "admin" },
  });
}

export async function createOrder(input, user) {
  const { prepared, price } = await prepareItems(input, user);

  if (!env.hasDatabase) {
    const now = new Date().toISOString();
    const order = {
      id: crypto.randomUUID(),
      order_number: orderNumber(),
      customer_id: user.id,
      customer_name: user.fullName || user.email,
      customer_email: user.email,
      subtotal: price.subtotal,
      tax: price.tax,
      total: price.total,
      currency: price.currency,
      status: "order",
      proof_status: "not_started",
      production_ready: false,
      configuration: input.configuration,
      created_at: now,
      items: prepared.map((item, index) => ({
        id: crypto.randomUUID(),
        productId: item.product.id,
        designId: item.designId ?? null,
        quantity: item.quantity,
        unitPrice: price.items[index].unitPrice,
        widthMm: item.width,
        heightMm: item.height,
        material: item.material,
        configuration: item.configuration,
        product: {
          id: item.product.id,
          slug: item.product.slug,
          name: item.product.name,
          family: item.product.family,
        },
        design: null,
        createdAt: now,
      })),
    };
    demoOrders.unshift(order);
    await notifyOrderPlaced({ order, user });
    return { order, price };
  }

  const order = await prisma.$transaction(async (transaction) => {
    const created = await transaction.order.create({
      data: {
        orderNumber: orderNumber(),
        customerId: user.id,
        status: "order",
        subtotal: price.subtotal,
        tax: price.tax,
        total: price.total,
        currency: price.currency,
        configuration: input.configuration,
        items: {
          create: prepared.map((item, index) => ({
            productId: item.product.id,
            designId: item.designId ?? null,
            quantity: item.quantity,
            unitPrice: price.items[index].unitPrice,
            widthMm: item.width,
            heightMm: item.height,
            material: item.material,
            configuration: item.configuration,
          })),
        },
      },
      include: orderInclude,
    });
    await transaction.orderEvent.create({
      data: {
        orderId: created.id,
        actorId: user.id,
        eventType: "order_created",
        metadata: { total: price.total, itemCount: price.itemCount },
      },
    });
    return created;
  });

  await notifyOrderPlaced({ order, user });
  return { order, price };
}

export async function reorder(id, user) {
  if (!env.hasDatabase) {
    const source = demoOrders.find(
      (order) => order.id === id && order.customer_id === user.id,
    );
    if (!source) return null;
    const createdAt = new Date().toISOString();
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      order_number: orderNumber(),
      status: "order",
      proof_status: "not_started",
      production_ready: false,
      created_at: createdAt,
      items: source.items?.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        createdAt,
      })),
    };
    demoOrders.unshift(copy);
    await notifyOrderPlaced({ order: copy, user, reordered: true });
    return copy;
  }

  const source = await prisma.order.findFirst({
    where: { id, customerId: user.id },
    include: { items: true },
  });
  if (!source) return null;

  const reordered = await prisma.order.create({
    data: {
      orderNumber: orderNumber(),
      customerId: user.id,
      status: "order",
      subtotal: source.subtotal,
      tax: source.tax,
      total: source.total,
      currency: source.currency,
      configuration: source.configuration,
      reorderedFromId: source.id,
      items: {
        create: source.items.map((item) => ({
          productId: item.productId,
          designId: item.designId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          material: item.material,
          configuration: item.configuration,
        })),
      },
      events: {
        create: {
          actorId: user.id,
          eventType: "order_reordered",
          metadata: { sourceOrderId: source.id },
        },
      },
    },
    include: orderInclude,
  });
  await notifyOrderPlaced({ order: reordered, user, reordered: true });
  return reordered;
}

