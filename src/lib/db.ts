import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaSingleton?: PrismaClient;
};

export function db(): PrismaClient {
  if (!globalForPrisma.prismaSingleton) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    globalForPrisma.prismaSingleton = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prismaSingleton;
}
