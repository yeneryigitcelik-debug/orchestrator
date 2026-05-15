// Eski / tehlikeli worker'ları DB'den temizle.
// - role='lead' silinmesin (ensureLead kendisi handle eder)
// - displayerall'ın kendi cwd'sinde bir helper varsa SİL (orchestrator'u düzenlemesin)
// - Eski "running" status'te kalan ama session dosyası kaybolmuş olanları temizle

import { PrismaClient } from "@prisma/client";
import { resolve } from "node:path";

const prisma = new PrismaClient();

const SELF = resolve(process.cwd()).replace(/\\/g, "/").toLowerCase();

const all = await prisma.worker.findMany();
let removed = 0;

for (const w of all) {
  if (w.role === "lead") continue; // Lead her zaman ensureLead handle eder

  const cwd = w.cwd.replace(/\\/g, "/").toLowerCase();
  const isSelf = cwd === SELF;
  const isStale =
    w.status === "running" || w.status === "thinking" || w.status === "starting";

  if (isSelf || isStale) {
    await prisma.worker.delete({ where: { id: w.id } });
    console.log(
      `removed: ${w.name} (${w.role}, ${w.status}, cwd=${w.cwd})${isSelf ? " [self-cwd]" : ""}`,
    );
    removed++;
  }
}

console.log(`temizlendi: ${removed} kayıt`);
await prisma.$disconnect();
