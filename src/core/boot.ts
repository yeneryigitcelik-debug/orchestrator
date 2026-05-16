// Node.js runtime boot — instrumentation.ts'ten YALNIZ Node runtime'ında
// dinamik import edilir. process.exit / child_process gibi Node-only API'lar
// burada toplanır; Edge bundle'ına sızmaz (Next, dinamik import edilen
// Node-only modülü Edge derlemesine katmaz).

import { orchestrator } from "./orchestrator";

declare global {
  // eslint-disable-next-line no-var
  var __shutdownHandlersInstalled: boolean | undefined;
}

/**
 * Sunucu açılış işleri: DB'den worker restore + Lead garantisi +
 * graceful shutdown sinyalleri. Bir kez (per process) çağrılır.
 */
export async function bootstrap(): Promise<void> {
  try {
    const { restored, skipped } = await orchestrator.restoreFromDB();
    if (restored > 0 || skipped > 0) {
      console.log(`[boot] orchestrator restored=${restored} skipped=${skipped}`);
    }
  } catch (err) {
    console.error("[boot] restore failed", err);
  }

  // Lead'i garantile — kullanıcı sadece Lead ile konuşur
  try {
    await orchestrator.ensureLead();
  } catch (err) {
    console.error("[boot] Lead ensure failed", err);
  }

  // Graceful shutdown — HMR'de tekrar tekrar listener bağlamasın diye guard'la.
  if (!globalThis.__shutdownHandlersInstalled) {
    globalThis.__shutdownHandlersInstalled = true;

    const shutdown = async (signal: string) => {
      console.log(`[boot] ${signal} alındı, shutdown...`);
      try {
        await orchestrator.shutdownAll();
      } catch (err) {
        console.error("[boot] shutdown error", err);
      }
      process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("beforeExit", () => {
      orchestrator.shutdownAll().catch(() => {});
    });
  }
}
