import prisma from "../config/db.js";
import { env } from "../config/env.js";
import { demoUserActivities } from "../data/demoStore.js";

const userActivitySelect = {
  id: true,
  activity: true,
  location: true,
  ipAddress: true,
  createdAt: true,
};

export async function createUserActivity(input, ipAddress) {
  if (!env.hasDatabase) {
    const activity = {
      id: crypto.randomUUID(),
      activity: input.activity,
      location: input.location,
      ipAddress,
      createdAt: new Date().toISOString(),
    };
    demoUserActivities.unshift(activity);
    return activity;
  }

  return prisma.userActivity.create({
    data: {
      activity: input.activity,
      location: input.location,
      ipAddress,
    },
    select: userActivitySelect,
  });
}
