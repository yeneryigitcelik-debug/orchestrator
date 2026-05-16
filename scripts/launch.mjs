// Ortak launcher — orchestrator daemon + Next.js'i birlikte ayağa kaldırır.
//
// Mimari: daemon (worker subprocess'leri + DB) ayrı process; Next (UI + API)
// ayrı process, daemon'a proxy yapar. Next çökerse launcher onu YENİDEN BAŞLATIR
// ama daemon'a dokunmaz — worker'lar hayatta kalır. İzolasyonun karşılığı bu.
//
// start.mjs → launch("prod"), dev.mjs → launch("dev").

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DAEMON_PORT = process.env.DAEMON_PORT || "3006";
const NEXT_PORT = process.env.PORT || "3005";

async function waitForHealth(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log("[launch] daemon hazır →", url);
        return true;
      }
    } catch {
      /* henüz ayakta değil */
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
  /** @type {import("node:child_process").ChildProcess[]} */
  const children = [];
  const killAll = (sig) => {
    shuttingDown = true;
    for (const c of children) {
      try {
        c.kill(sig);
      } catch {
        /* yoksay */
      }
    }
  };
  process.on("SIGINT", () => killAll("SIGINT"));
  process.on("SIGTERM", () => killAll("SIGTERM"));

  // 3. daemon — TS'i tsx ile çalıştır, .env'i Node yükler
  const daemon = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--env-file-if-exists=.env",
      resolve(root, "src", "core", "daemon-server.ts"),
    ],
    { stdio: "inherit", cwd: root, env },
  );
  children.push(daemon);
  // Daemon çıkışı kritik — UI daemonsuz işe yaramaz. Hepsini kapat.
  daemon.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`[launch] daemon çıktı (code ${code}) — sistem kapatılıyor`);
    killAll("SIGTERM");
    process.exit(code ?? 1);
  });

  // 4. daemon health bekle (Next proxy'si ona bağımlı)
  await waitForHealth(`http://127.0.0.1:${DAEMON_PORT}/health`);

  // 5. Next — çökerse daemon'a dokunmadan yeniden başlat
  const nextArgs =
    mode === "prod"
      ? [nextBin, "start", "-p", NEXT_PORT]
      : [nextBin, "dev", "-p", NEXT_PORT];
  const startNext = () => {
    const next = spawn(process.execPath, nextArgs, {
      stdio: "inherit",
      cwd: root,
      env,
    });
    children.push(next);
    next.on("exit", (code) => {
      if (shuttingDown) return;
      const i = children.indexOf(next);
      if (i >= 0) children.splice(i, 1);
      console.error(
        `[launch] next çıktı (code ${code}) — daemon ayakta, next 1 sn içinde yeniden başlatılıyor`,
      );
      setTimeout(startNext, 1000);
    });
  };
  startNext();

  console.log(
    `[launch] ${mode} modu — daemon :${DAEMON_PORT}, panel :${NEXT_PORT}`,
  );
}
