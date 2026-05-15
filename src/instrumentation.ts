// Next.js server startup hook. Bir kez (per process) çalışır.
// Burada orchestrator'ı DB'den geri yüklüyoruz — workerlar daemon restart'tan sonra
// otomatik diriltilsin. Ayrıca SIGTERM/SIGINT yakalayıp graceful shutdown ediyoruz.

declare global {
  // eslint-disable-next-line no-var
  var __shutdownHandlersInstalled: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Dinamik import: edge runtime'ı kirletmesin diye
  const { orchestrator } = await import("@/core/orchestrator");

  try {
    const { restored, skipped } = await orchestrator.restoreFromDB();
    if (restored > 0 || skipped > 0) {
      console.log(
        `[instrumentation] orchestrator restored=${restored} skipped=${skipped}`,
      );
    }
  } catch (err) {
    console.error("[instrumentation] restore failed", err);
  }

  // Lead'i garantile — kullanıcı sadece Lead ile konuşur
  try {
    await orchestrator.ensureLead();
  } catch (err) {
    console.error("[instrumentation] Lead ensure failed", err);
  }

  // Graceful shutdown — HMR'de tekrar tekrar listener bağlamasın diye guard'la.
  if (!globalThis.__shutdownHandlersInstalled) {
    globalThis.__shutdownHandlersInstalled = true;

    const shutdown = async (signal: string) => {
      console.log(`[instrumentation] ${signal} alındı, shutdown...`);
      try {
        await orchestrator.shutdownAll();
      } catch (err) {
        console.error("[instrumentation] shutdown error", err);
      }
      process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
    // Windows'ta NSSM ile servis stop edilince genelde SIGTERM gelir;
    // gelmezse de exit handler son care olarak burada.
    process.on("beforeExit", () => {
      orchestrator.shutdownAll().catch(() => {});
    });
  }
}
