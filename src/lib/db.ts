import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prismaSingleton?: PrismaClient;
};

export function db(): PrismaClient {
  if (!globalForPrisma.prismaSingleton) {
    globalForPrisma.prismaSingleton = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  return globalForPrisma.prismaSingleton;
}
