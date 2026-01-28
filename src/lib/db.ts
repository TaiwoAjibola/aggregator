import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prismaSingleton?: PrismaClient;
  prismaPool?: Pool;
};

export function db(): PrismaClient {
  if (!globalForPrisma.prismaSingleton) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    if (!globalForPrisma.prismaPool) {
      globalForPrisma.prismaPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }

    const adapter = new PrismaPg(globalForPrisma.prismaPool);
    globalForPrisma.prismaSingleton = new PrismaClient({ adapter });
  }
  return globalForPrisma.prismaSingleton;
}
