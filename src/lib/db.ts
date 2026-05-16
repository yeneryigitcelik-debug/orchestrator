// Prisma client singleton — Next.js dev HMR'inde yeniden yaratılmasını engeller.

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// SQLite WAL journal — crash sonrası kurtarma daha güvenli, yazma daha dayanıklı.
// Daemon DB'nin tek sahibi; pragma DB seviyesinde kalıcı, bir kez uygulamak yeter.
prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch((e) => {
  console.error("[db] WAL pragma uygulanamadı", e);
});
