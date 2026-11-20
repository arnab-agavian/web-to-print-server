import prisma from "../config/db.js";
import { env } from "../config/env.js";

const addressOrder = [{ isDefault: "desc" }, { updatedAt: "desc" }];

function requireDatabase() {
  if (!env.hasDatabase) {
    const error = new Error(
      "Database is not configured. Address operations require PostgreSQL.",
    );
    error.status = 503;
    throw error;
  }
}

export async function listAddresses(user) {
  requireDatabase();
  return prisma.address.findMany({
    where: { customerId: user.id },
    orderBy: addressOrder,
  });
}

export async function getAddress(id, user) {
  requireDatabase();
  return prisma.address.findFirst({
    where: { id, customerId: user.id },
  });
}

export async function createAddress(input, user) {
  requireDatabase();
  return prisma.$transaction(async (transaction) => {
    const existingCount = await transaction.address.count({
      where: { customerId: user.id },
    });
    const isDefault = input.isDefault || existingCount === 0;

    if (isDefault) {
      await transaction.address.updateMany({
        where: { customerId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return transaction.address.create({
      data: { ...input, customerId: user.id, isDefault },
    });
  });
}

export async function updateAddress(id, input, user) {
  requireDatabase();
  const address = await prisma.address.findFirst({
    where: { id, customerId: user.id },
    select: { id: true },
  });
  if (!address) return null;

  return prisma.address.update({ where: { id }, data: input });
}

export async function setDefaultAddress(id, user) {
  requireDatabase();
  return prisma.$transaction(async (transaction) => {
    const address = await transaction.address.findFirst({
      where: { id, customerId: user.id },
      select: { id: true },
    });
    if (!address) return null;

    await transaction.address.updateMany({
      where: { customerId: user.id, isDefault: true },
      data: { isDefault: false },
    });
    return transaction.address.update({
      where: { id },
      data: { isDefault: true },
    });
  });
}

export async function deleteAddress(id, user) {
  requireDatabase();
  return prisma.$transaction(async (transaction) => {
    const address = await transaction.address.findFirst({
      where: { id, customerId: user.id },
    });
    if (!address) return null;

    await transaction.address.delete({ where: { id } });
    if (address.isDefault) {
      const replacement = await transaction.address.findFirst({
        where: { customerId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (replacement) {
        await transaction.address.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
    return address;
  });
}
