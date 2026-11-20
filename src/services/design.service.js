import prisma from "../config/db.js";
import { env } from "../config/env.js";

const designInclude = {
  product: {
    select: { id: true, slug: true, name: true, family: true, active: true },
  },
  template: {
    select: {
      id: true,
      name: true,
      canvasWidth: true,
      canvasHeight: true,
      safeArea: true,
      placeholderRules: true,
      thumbnailPath: true,
      active: true,
    },
  },
};

function requireDatabase() {
  if (!env.hasDatabase) {
    const error = new Error(
      "Database is not configured. Design operations require PostgreSQL.",
    );
    error.status = 503;
    throw error;
  }
}

function normalize(design) {
  if (!design) return null;
  return {
    ...design,
    template: design.template
      ? {
          ...design.template,
          canvasWidth: Number(design.template.canvasWidth),
          canvasHeight: Number(design.template.canvasHeight),
        }
      : null,
  };
}

function ownershipWhere(id, user) {
  return { id, customerId: user.id };
}

export async function listDesigns(filters, user) {
  requireDatabase();
  const designs = await prisma.design.findMany({
    where: {
      customerId: user.id,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
    },
    include: designInclude,
    orderBy: { updatedAt: "desc" },
  });
  return designs.map(normalize);
}

export async function getDesign(id, user) {
  requireDatabase();
  return normalize(
    await prisma.design.findFirst({
      where: ownershipWhere(id, user),
      include: designInclude,
    }),
  );
}

export async function createDesign(input, user) {
  requireDatabase();
  const product = await prisma.product.findFirst({
    where: { id: input.productId, active: true },
    select: { id: true },
  });
  if (!product) {
    const error = new Error("Product not found.");
    error.status = 404;
    throw error;
  }

  if (input.templateId) {
    const template = await prisma.template.findFirst({
      where: {
        id: input.templateId,
        productId: input.productId,
        active: true,
      },
      select: { id: true },
    });
    if (!template) {
      const error = new Error(
        "Template not found or does not belong to the selected product.",
      );
      error.status = 400;
      throw error;
    }
  }

  return normalize(
    await prisma.design.create({
      data: { ...input, customerId: user.id },
      include: designInclude,
    }),
  );
}

export async function updateDesign(id, input, user) {
  requireDatabase();
  const design = await prisma.design.findFirst({
    where: ownershipWhere(id, user),
    select: { id: true },
  });
  if (!design) return null;

  return normalize(
    await prisma.design.update({
      where: { id },
      data: input,
      include: designInclude,
    }),
  );
}

export async function deleteDesign(id, user) {
  requireDatabase();
  const design = await prisma.design.findFirst({
    where: ownershipWhere(id, user),
    include: { _count: { select: { orderItems: true } } },
  });
  if (!design) return null;
  if (design._count.orderItems > 0) {
    const error = new Error(
      "Designs used by an order cannot be deleted. Archive the design instead.",
    );
    error.status = 409;
    throw error;
  }

  return prisma.design.delete({ where: { id } });
}
