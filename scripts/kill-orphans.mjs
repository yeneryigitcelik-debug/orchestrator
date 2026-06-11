// Önceki `pnpm prod` / `pnpm dev` çalıştırmasından orphan kalan
// supervisor (start.mjs/dev.mjs) + daemon + Next + MCP process'lerini öldürür.
// Boot'tan önce çalışır — orphan daemon Prisma DLL'ini (query_engine-windows.dll.node)
// tutuyorsa db:generate adımında EPERM (file rename) hatası alıyoruz.
//
// ÖNEMLİ: Yalnız portu (:3005/:3006) dinleyenleri öldürmek YETMEZ. Supervisor
// (scripts/start.mjs, launch.mjs'i import eder) hiçbir port dinlemez ama daemon'ı
// yeniden doğurur; port-kill'den hemen sonra daemon'ı respawn edip DLL'i tekrar
// kilitler. Bu yüzden ÖNCE supervisor'ı komut-satırı eşleşmesiyle öldürüp respawn'ı
// durduruyoruz, sonra daemon/MCP'yi, en son da port süpürmesini yapıyoruz.

import { execSync } from "node:child_process";
import { platform } from "node:os";

const PORTS = [3005, 3006];
const isWin = platform() === "win32";

// Senkron kısa uyku — öldürülen process'in dosya handle'larını (Windows DLL kilidi)
// bırakması için kısa bir pencere bırakır.
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// node.exe process'lerini komut satırına göre eşleştirip öldürür (Windows).
function killWinByPattern(regex) {
  try {
    const ps =
      `Get-CimInstance Win32_Process -Filter 'Name = ''node.exe''' | ` +
      `Where-Object { $_.CommandLine -match '${regex}' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }`;
    const out = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: "utf8" }).trim();
    return out ? out.split(/\s+/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Komut satırına göre eşleştirip öldürür (Unix/macOS).
function killUnixByPattern(pattern) {
  try {
    const out = execSync(`pgrep -f '${pattern}'`, { encoding: "utf8" }).trim();
    const pids = out ? out.split(/\s+/).filter(Boolean) : [];
    if (pids.length) {
      try {
        execSync(`pkill -9 -f '${pattern}'`, { stdio: "ignore" });
      } catch {
        // yoksay
      }
    }
    return pids;
  } catch {
    return [];
  }
}

function killByPattern(winRegex, unixPattern) {
  return isWin ? killWinByPattern(winRegex) : killUnixByPattern(unixPattern);
}

function killOnWindows(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique"`,
      { encoding: "utf8" },
    ).trim();
    if (!out) return [];
    const pids = out.split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`, { stdio: "ignore" });
      } catch {
        // process zaten ölmüş olabilir
      }
    }
    return pids;
  } catch {
    return [];
  }
}

function killOnUnix(port) {
  try {
    const out = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
    if (!out) return [];
    const pids = out.split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      } catch {
        // yoksay
      }
    }
    return pids;
  } catch {
    return [];
  }
}

let totalKilled = 0;

// 1) Supervisor'ı ÖNCE öldür → daemon respawn'ı dursun.
//    (cmdline'da port yok; yalnız betik adından yakalanır.)
const supervisor = killByPattern(
  "scripts[\\\\/](start|dev|launch)\\.mjs",
  "scripts/(start|dev|launch)\\.mjs",
);
if (supervisor.length) {
  console.log(`[kill-orphans] supervisor → PID ${supervisor.join(", ")} öldürüldü`);
  totalKilled += supervisor.length;
}

// 2) Daemon + MCP — port dinlemese/henüz boot ederken bile cmdline'dan yakala.
const daemon = killByPattern("daemon-server\\.(ts|js)", "daemon-server\\.(ts|js)");
if (daemon.length) {
  console.log(`[kill-orphans] daemon → PID ${daemon.join(", ")} öldürüldü`);
  totalKilled += daemon.length;
}
const mcp = killByPattern("mcp-server\\.mjs", "mcp-server\\.mjs");
if (mcp.length) {
  console.log(`[kill-orphans] mcp → PID ${mcp.join(", ")} öldürüldü`);
  totalKilled += mcp.length;
}

// Handle'lar serbest kalsın (Windows query engine DLL kilidi).
if (supervisor.length || daemon.length || mcp.length) sleep(500);

// 3) Port süpürmesi — hâlâ :3005/:3006 dinleyen ne kaldıysa (Next dahil).
const portKiller = isWin ? killOnWindows : killOnUnix;
for (const port of PORTS) {
  const killed = portKiller(port);
  if (killed.length) {
    console.log(`[kill-orphans] :${port} → PID ${killed.join(", ")} öldürüldü`);
    totalKilled += killed.length;
  }
}

if (totalKilled === 0) {
  console.log("[kill-orphans] orphan yok, devam");
}
