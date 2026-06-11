// Ortak launcher — orchestrator daemon + Next.js'i birlikte ayağa kaldırır
// ve DENETLER. start.mjs → launch("prod"), dev.mjs → launch("dev").
//
// Dayanıklılık:
//  - İki process de çökerse otomatik yeniden başlatılır (crash-loop guard'lı:
//    60sn'de 5'ten fazla çökme → vazgeç, sistemi kapat, kullanıcı incelesin).
//  - Daemon yeniden başlayınca restoreFromDB worker'ları DB'den kurtarır.
//  - Daemon HANG ederse (process canlı ama /health yanıt vermiyor) health
//    monitor onu öldürür → supervisor yeniden başlatır.
//  - Next çökerse daemon'a dokunulmaz — worker'lar yaşar.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DAEMON_PORT = process.env.DAEMON_PORT || "3006";
const NEXT_PORT = process.env.PORT || "3005";
const HEALTH_URL = `http://127.0.0.1:${DAEMON_PORT}/health`;

// crash-loop guard
const RESTART_WINDOW_MS = 60_000;
const MAX_RESTARTS = 5;
// daemon hang algılama
const HEALTH_INTERVAL_MS = 30_000;
const HEALTH_TIMEOUT_MS = 5_000;
const HEALTH_MAX_FAILS = 3;

async function ping(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return (await fetch(url, { signal: ctrl.signal })).ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function waitForHealth(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await ping(HEALTH_URL, 2_000)) {
      console.log("[launch] daemon hazır →", HEALTH_URL);
      return true;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.error("[launch] daemon health timeout — yine de devam ediliyor");
  return false;
}

/** @param {"dev"|"prod"} mode */
export async function launch(mode) {
  // 1. dizinler + .env garantisi
  mkdirSync(resolve(root, "data"), { recursive: true });
  mkdirSync(resolve(root, "logs"), { recursive: true });
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    cpSync(resolve(root, ".env.example"), envPath);
    console.log("[launch] .env yoktu, .env.example'dan kopyalandı");
  }

  // 2. node_modules / build kontrolü
  const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextBin)) {
    console.error("[launch] node_modules/next yok. Önce: pnpm install");
    process.exit(1);
  }
  if (mode === "prod" && !existsSync(resolve(root, ".next"))) {
    console.error("[launch] .next yok. Önce: pnpm build");
    process.exit(1);
  }

  const env = {
    ...process.env,
    DAEMON_PORT,
    NODE_ENV: mode === "prod" ? "production" : "development",
  };

  let shuttingDown = false;

  /**
   * Denetlenen process — beklenmedik çıkışta crash-loop guard'lı yeniden başlatır.
   * @param {string} name  @param {() => [string, string[]]} makeArgs
   */
  function supervise(name, makeArgs) {
    /** @type {import("node:child_process").ChildProcess | null} */
    let child = null;
    let stamps = [];
    const start = () => {
      if (shuttingDown) return;
      const [cmd, args] = makeArgs();
      child = spawn(cmd, args, { stdio: "inherit", cwd: root, env });
      child.on("exit", (code, signal) => {
        if (shuttingDown) return;
        const now = Date.now();
        stamps = stamps.filter((t) => now - t < RESTART_WINDOW_MS);
        stamps.push(now);
        if (stamps.length > MAX_RESTARTS) {
          console.error(
            `[launch] ${name} ${RESTART_WINDOW_MS / 1000}sn içinde ${stamps.length}x çöktü — vazgeçiliyor. Logları inceleyin.`,
          );
          shutdown(1);
          return;
        }
        console.error(
          `[launch] ${name} çıktı (code ${code ?? signal}) — yeniden başlatılıyor (${stamps.length}/${MAX_RESTARTS})`,
        );
        setTimeout(start, 1000);
      });
    };
    return {
      start,
      get child() {
        return child;
      },
      stop() {
        try {
          child?.kill("SIGTERM");
        } catch {
          /* yoksay */
        }
      },
      forceKill() {
        try {
          child?.kill("SIGKILL");
        } catch {
          /* yoksay */
        }
      },
    };
  }

  const daemon = supervise("daemon", () => [
    process.execPath,
    [
      // Windows/AV/proxy TLS interception → Node kendi CA paketi yerine sistem
      // (OS) sertifika deposunu da okusun; yoksa node-telegram-bot-api
      // api.telegram.org'a bağlanırken "unable to verify the first certificate"
      // verir. Node 22+ gerektirir; macOS/Linux'ta da zararsız (keychain/store okur).
      "--use-system-ca",
      "--import",
      "tsx",
      "--env-file-if-exists=.env",
      resolve(root, "src", "core", "daemon-server.ts"),
    ],
  ]);
  const next = supervise("next", () => [
    process.execPath,
    [nextBin, mode === "prod" ? "start" : "dev", "-p", NEXT_PORT],
  ]);

  /** Tüm sistemi kapat — çocukların graceful çıkışını en fazla 8sn bekle. */
  function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("[launch] kapatılıyor...");
    daemon.stop();
    next.stop();
    const deadline = Date.now() + 8_000;
    const iv = setInterval(() => {
      const alive = [daemon.child, next.child].filter(
        (c) => c && c.exitCode === null && c.signalCode === null,
      );
      if (alive.length === 0 || Date.now() > deadline) {
        clearInterval(iv);
        daemon.forceKill();
        next.forceKill();
        process.exit(code);
      }
    }, 250);
  }
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  // 3. başlat: daemon → health bekle → next
  daemon.start();
  await waitForHealth();
  next.start();

  // 4. health monitor — daemon hang ederse öldür, supervisor yeniden başlatır
  let healthFails = 0;
  setInterval(async () => {
    if (shuttingDown || !daemon.child || daemon.child.exitCode !== null) return;
    if (await ping(HEALTH_URL, HEALTH_TIMEOUT_MS)) {
      healthFails = 0;
      return;
    }
    healthFails++;
    console.error(
      `[launch] daemon /health başarısız (${healthFails}/${HEALTH_MAX_FAILS})`,
    );
    if (healthFails >= HEALTH_MAX_FAILS) {
      healthFails = 0;
      console.error(
        "[launch] daemon yanıt vermiyor (hang) — öldürülüp yeniden başlatılıyor",
      );
      daemon.forceKill(); // exit handler supervisor'ı tetikler → restart
    }
  }, HEALTH_INTERVAL_MS);

  console.log(
    `[launch] ${mode} modu — daemon :${DAEMON_PORT}, panel :${NEXT_PORT} (denetleniyor)`,
  );
}
