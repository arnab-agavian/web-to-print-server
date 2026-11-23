import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { demoNotifications } from "../data/demoStore.js";

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  data: true,
  readAt: true,
  createdAt: true,
};

function toPublicDemoNotification(notification) {
  const { recipientId: _recipientId, dedupeKey: _dedupeKey, ...result } =
    notification;
  return result;
}

export async function createNotification({
  recipientId,
  type,
  title,
  message,
  data = {},
  dedupeKey = null,
}) {
  if (!recipientId) return null;

  if (!env.hasDatabase) {
    const existing = dedupeKey
      ? demoNotifications.find(
          (notification) =>
            notification.recipientId === recipientId &&
            notification.dedupeKey === dedupeKey,
        )
      : null;
    if (existing) return toPublicDemoNotification(existing);

    const notification = {
      id: crypto.randomUUID(),
      recipientId,
      type,
      title,
      message,
      data,
      dedupeKey,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    demoNotifications.unshift(notification);
    return toPublicDemoNotification(notification);
  }

  const create = { recipientId, type, title, message, data, dedupeKey };
  return dedupeKey
    ? prisma.notification.upsert({
        where: { recipientId_dedupeKey: { recipientId, dedupeKey } },
        update: {},
        create,
        select: notificationSelect,
      })
    : prisma.notification.create({ data: create, select: notificationSelect });
}

export async function createAdminNotifications(notification) {
  if (!env.hasDatabase) {
    await createNotification({ ...notification, recipientId: "demo-admin" });
    return;
  }

  const admins = await prisma.profile.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map(({ id }) => ({ ...notification, recipientId: id })),
    skipDuplicates: true,
  });
}

export async function deliverInAppNotifications(deliveries) {
  const results = await Promise.allSettled(
    deliveries.map((delivery) => delivery()),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `In-app notification delivery failed: ${result.reason?.message || result.reason}`,
      );
    }
  }
}

export async function listNotifications(user, filters) {
  if (!env.hasDatabase) {
    let notifications = demoNotifications.filter(
      (notification) => notification.recipientId === user.id,
    );
    if (filters.unreadOnly) {
      notifications = notifications.filter((notification) => !notification.readAt);
    }
    if (filters.type) {
      notifications = notifications.filter(
        (notification) => notification.type === filters.type,
      );
    }
    const total = notifications.length;
    const unreadCount = demoNotifications.filter(
      (notification) =>
        notification.recipientId === user.id && !notification.readAt,
    ).length;
    return {
      notifications: notifications
        .slice(filters.offset, filters.offset + filters.limit)
        .map(toPublicDemoNotification),
      total,
      unreadCount,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  const where = {
    recipientId: user.id,
    ...(filters.unreadOnly ? { readAt: null } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  };
  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: "desc" },
      skip: filters.offset,
      take: filters.limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { recipientId: user.id, readAt: null },
    }),
  ]);
  return {
    notifications,
    total,
    unreadCount,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export async function getUnreadCount(user) {
  const unreadCount = !env.hasDatabase
    ? demoNotifications.filter(
        (notification) =>
          notification.recipientId === user.id && !notification.readAt,
      ).length
    : await prisma.notification.count({
        where: { recipientId: user.id, readAt: null },
      });
  return { unreadCount };
}

export async function markNotificationRead(id, user) {
  if (!env.hasDatabase) {
    const notification = demoNotifications.find(
      (item) => item.id === id && item.recipientId === user.id,
    );
    if (!notification) return null;
    notification.readAt ||= new Date().toISOString();
    return toPublicDemoNotification(notification);
  }

  const result = await prisma.notification.updateMany({
    where: { id, recipientId: user.id },
    data: { readAt: new Date() },
  });
  if (!result.count) return null;
  return prisma.notification.findUnique({
    where: { id },
    select: notificationSelect,
  });
}

export async function markAllNotificationsRead(user) {
  if (!env.hasDatabase) {
    const now = new Date().toISOString();
    let updatedCount = 0;
    for (const notification of demoNotifications) {
      if (notification.recipientId === user.id && !notification.readAt) {
        notification.readAt = now;
        updatedCount += 1;
      }
    }
    return { updatedCount };
  }

  const result = await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: result.count };
}

export async function deleteNotification(id, user) {
  if (!env.hasDatabase) {
    const index = demoNotifications.findIndex(
      (notification) =>
        notification.id === id && notification.recipientId === user.id,
    );
    if (index === -1) return false;
    demoNotifications.splice(index, 1);
    return true;
  }

  const result = await prisma.notification.deleteMany({
    where: { id, recipientId: user.id },
  });
  return result.count > 0;
}
