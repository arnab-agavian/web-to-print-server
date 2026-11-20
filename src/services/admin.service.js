import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { demoOrders } from "../data/demoStore.js";
import { notifyOrderStatusChanged } from "./notification.service.js";

const closedStatuses = ["completed", "cancelled"];
const jobItemInclude = {
  product: { select: { id: true, name: true, family: true } },
  design: {
    select: {
      id: true,
      name: true,
      designData: true,
      previewPath: true,
      sourceFilePath: true,
      status: true,
      template: {
        select: {
          id: true,
          name: true,
          canvasWidth: true,
          canvasHeight: true,
          safeArea: true,
          placeholderRules: true,
          thumbnailPath: true,
        },
      },
    },
  },
};

function listDemoCustomers(filters) {
  const customersById = new Map();
  for (const order of demoOrders) {
    const customer = customersById.get(order.customer_id) || {
      id: order.customer_id,
      email: order.customer_email,
      fullName: order.customer_name || null,
      companyName: null,
      phone: null,
      orderCount: 0,
      jobsLeft: 0,
      totalSpent: 0,
      lastOrderAt: null,
      createdAt: null,
    };
    customer.orderCount += 1;
    if (!closedStatuses.includes(order.status)) customer.jobsLeft += 1;
    customer.totalSpent += Number(order.total || 0);
    if (!customer.lastOrderAt || order.created_at > customer.lastOrderAt) {
      customer.lastOrderAt = order.created_at;
    }
    customersById.set(order.customer_id, customer);
  }

  let customers = [...customersById.values()].sort((a, b) =>
    String(b.lastOrderAt).localeCompare(String(a.lastOrderAt)),
  );
  if (filters.q) {
    const query = filters.q.toLowerCase();
    customers = customers.filter((customer) =>
      [customer.email, customer.fullName, customer.companyName, customer.phone]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query)),
    );
  }
  const total = customers.length;
  return {
    customers: customers.slice(filters.offset, filters.offset + filters.limit),
    total,
  };
}

export async function listCustomers(filters) {
  if (!env.hasDatabase) return listDemoCustomers(filters);

  const where = {
    role: "customer",
    orders: { some: {} },
    ...(filters.q
      ? {
          OR: [
            { email: { contains: filters.q, mode: "insensitive" } },
            { fullName: { contains: filters.q, mode: "insensitive" } },
            { companyName: { contains: filters.q, mode: "insensitive" } },
            { phone: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: filters.offset,
      take: filters.limit,
    }),
    prisma.profile.count({ where }),
  ]);

  const customerIds = profiles.map((profile) => profile.id);
  if (!customerIds.length) return { customers: [], total };

  const [orderStats, unfinishedStats] = await prisma.$transaction([
    prisma.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: {
        customerId: { in: customerIds },
        status: { notIn: closedStatuses },
      },
      _count: { _all: true },
    }),
  ]);
  const statsByCustomer = new Map(
    orderStats.map((stats) => [stats.customerId, stats]),
  );
  const unfinishedByCustomer = new Map(
    unfinishedStats.map((stats) => [stats.customerId, stats._count._all]),
  );

  return {
    customers: profiles.map((profile) => {
      const stats = statsByCustomer.get(profile.id);
      return {
        ...profile,
        orderCount: stats?._count._all || 0,
        jobsLeft: unfinishedByCustomer.get(profile.id) || 0,
        totalSpent: Number(stats?._sum.total || 0),
        lastOrderAt: stats?._max.createdAt || null,
      };
    }),
    total,
  };
}

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
          include: jobItemInclude,
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
    include: {
      customer: { select: { fullName: true, email: true } },
      items: { include: jobItemInclude, orderBy: { createdAt: "asc" } },
      proofs: {
        where: { status: "approved" },
        orderBy: { version: "desc" },
        take: 1,
      },
      productionFiles: true,
    },
  });
}
