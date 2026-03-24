import { PrismaClient } from './generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrisma() {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

// Re-create if the cached client lacks the exercise model (after schema changes)
if (globalForPrisma.prisma && !(globalForPrisma.prisma as unknown as Record<string, unknown>).exercise) {
  globalForPrisma.prisma = undefined as unknown as PrismaClient;
}
export const db = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
