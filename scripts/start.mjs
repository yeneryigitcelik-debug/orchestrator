#!/usr/bin/env node
// Production server entry point.
// NSSM bu dosyayı `node scripts\start.mjs` ile çağırır.
//
// İşler:
// 1. data/ ve logs/ klasörlerini garanti et
// 2. .env yoksa .env.example'dan kopyala
// 3. node_modules yoksa hata fırlat (build edilmemiş demektir)
// 4. next-server'ı production modda başlat

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

mkdirSync(resolve(root, "data"), { recursive: true });
mkdirSync(resolve(root, "logs"), { recursive: true });

const envPath = resolve(root, ".env");
if (!existsSync(envPath)) {
  cpSync(resolve(root, ".env.example"), envPath);
  console.log("[start] .env yoktu, .env.example'dan kopyalandı");
}

const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) {
  console.error(
    "[start] node_modules\\next bulunamadı. Önce: pnpm install && pnpm build",
  );
  process.exit(1);
}

const buildDir = resolve(root, ".next");
if (!existsSync(buildDir)) {
  console.error("[start] .next yok. Önce: pnpm build");
  process.exit(1);
}

const port = process.env.PORT || "3000";
const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
  cwd: root,
});

const forwardSignal = (sig) => {
  try {
    child.kill(sig);
  } catch {}
};
process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code) => process.exit(code ?? 0));
