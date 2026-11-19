import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/index.js";

const globalForPrisma = globalThis;
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma =
  globalForPrisma.__digitalHeroesPrisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production")
  globalForPrisma.__digitalHeroesPrisma = prisma;
export default prisma;
