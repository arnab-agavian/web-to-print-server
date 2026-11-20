import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { createTemplateSchema } from "../validation/template.validation.js";

function requireDatabase() {
  if (!env.hasDatabase) {
    const error = new Error(
      "Database is not configured. Template operations require PostgreSQL.",
    );
    error.status = 503;
    throw error;
  }
}

function normalize(template) {
  return {
    ...template,
    canvasWidth: Number(template.canvasWidth),
    canvasHeight: Number(template.canvasHeight),
  };
}

export async function listProductTemplates(productSlug) {
  requireDatabase();
  const product = await prisma.product.findFirst({
    where: { slug: productSlug, active: true },
    select: {
      templates: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return product ? product.templates.map(normalize) : null;
}

export async function getTemplate(id) {
  requireDatabase();
  const template = await prisma.template.findFirst({
    where: { id, active: true, product: { active: true } },
  });
  return template ? normalize(template) : null;
}

export async function createTemplate(productSlug, input) {
  requireDatabase();
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) return null;

  return normalize(
    await prisma.template.create({
      data: { ...input, productId: product.id },
    }),
  );
}

export async function updateTemplate(id, input) {
  requireDatabase();
  const current = await prisma.template.findUnique({ where: { id } });
  if (!current) return null;

  const normalized = normalize(current);
  createTemplateSchema.parse({
    name: normalized.name,
    canvasWidth: normalized.canvasWidth,
    canvasHeight: normalized.canvasHeight,
    safeArea: normalized.safeArea,
    placeholderRules: normalized.placeholderRules,
    thumbnailPath: normalized.thumbnailPath,
    active: normalized.active,
    ...input,
  });

  return normalize(
    await prisma.template.update({ where: { id }, data: input }),
  );
}

export async function deleteTemplate(id) {
  requireDatabase();
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return null;
  return normalize(await prisma.template.delete({ where: { id } }));
}
