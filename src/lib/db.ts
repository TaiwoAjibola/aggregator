import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prismaSingleton?: PrismaClient;
};

function resolveSqliteFilePath(databaseUrl: string): string {
  const trimmed = databaseUrl.trim();
  if (!trimmed) {
    throw new Error("DATABASE_URL is empty");
  }

  if (!trimmed.startsWith("file:")) {
    throw new Error(
      `Unsupported DATABASE_URL for SQLite adapter: ${databaseUrl}. Expected file:...`,
    );
  }

  const rawPath = trimmed.slice("file:".length);
  if (!rawPath) {
    throw new Error("DATABASE_URL missing file path");
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

export function db(): PrismaClient {
  if (!globalForPrisma.prismaSingleton) {
    const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
    const filePath = resolveSqliteFilePath(databaseUrl);

    const adapter = new PrismaBetterSqlite3({ url: filePath });
    globalForPrisma.prismaSingleton = new PrismaClient({ adapter });
  }
  return globalForPrisma.prismaSingleton;
}
