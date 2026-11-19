import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { demoOrders } from "../data/demoStore.js";
import { notifyOrderStatusChanged } from "./notification.service.js";

export async function listJobs(filters) {
  if (!env.hasDatabase) {
    let rows = demoOrders;
    if (filters.status)
      rows = rows.filter((order) => order.status === filters.status);
    if (filters.q)
      rows = rows.filter((order) =>
        JSON.stringify(order).toLowerCase().includes(filters.q.toLowerCase()),
      );
    return {
      jobs: rows.slice(filters.offset, filters.offset + filters.limit),
      total: rows.length,
    };
  }
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { orderNumber: { contains: filters.q, mode: "insensitive" } },
            {
              customer: {
                fullName: { contains: filters.q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  const [jobs, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { fullName: true, email: true } },
        items: {
          include: { product: { select: { name: true, family: true } } },
        },
        proofs: { orderBy: { version: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: filters.offset,
      take: filters.limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { jobs, total };
}
export async function updateJobStatus(id, status, user) {
  if (!env.hasDatabase) {
    const order = demoOrders.find((item) => item.id === id);
    if (!order) return null;
    if (status === "production" && !order.production_ready) {
      const error = new Error(
        "An approved proof is required before production.",
      );
      error.status = 409;
      throw error;
    }
    order.status = status;
    order.updated_at = new Date().toISOString();
    await notifyOrderStatusChanged({
      order,
      recipient: { email: order.customer_email, fullName: order.customer_name },
    });
    return order;
  }
  const order = await prisma.order.findUnique({
    where: { id },
    select: { productionReady: true },
  });
  if (!order) return null;
  if (status === "production" && !order.productionReady) {
    const error = new Error("An approved proof is required before production.");
    error.status = 409;
    throw error;
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id },
      data: { status, completedAt: status === "completed" ? new Date() : null },
      include: { customer: { select: { email: true, fullName: true } } },
    });
    await tx.orderEvent.create({
      data: {
        orderId: id,
        actorId: user.id,
        eventType: "status_changed",
        metadata: { status },
      },
    });
    return result;
  });
  await notifyOrderStatusChanged({
    order: updated,
    recipient: updated.customer,
  });
  return updated;
}
export async function getMetrics() {
  if (!env.hasDatabase)
    return {
      orders: demoOrders.length,
      revenue: demoOrders.reduce((sum, order) => sum + order.total, 0),
      awaitingProof: demoOrders.filter(
        (order) => order.proof_status === "awaiting_approval",
      ).length,
      inProduction: demoOrders.filter((order) => order.status === "production")
        .length,
      completed: demoOrders.filter((order) => order.status === "completed")
        .length,
    };
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [orders, revenue, awaitingProof, inProduction, completed] =
    await prisma.$transaction([
      prisma.order.count({ where: { createdAt: { gte: start } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: start }, status: { not: "cancelled" } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { proofStatus: "awaiting_approval" } }),
      prisma.order.count({ where: { status: "production" } }),
      prisma.order.count({
        where: { status: "completed", createdAt: { gte: start } },
      }),
    ]);
  return {
    orders,
    revenue: Number(revenue._sum.total || 0),
    awaitingProof,
    inProduction,
    completed,
  };
}
export async function getProductionOrder(id) {
  if (!env.hasDatabase)
    return demoOrders.find((order) => order.id === id) || null;
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
}
