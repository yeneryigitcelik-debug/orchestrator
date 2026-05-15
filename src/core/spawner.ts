// Düşük seviyeli claude CLI subprocess başlatıcı.
// Worker class bunu sarmalar; burası saf I/O katmanı.

import { spawn, execSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";

export interface SpawnOptions {
  bin: string;
  sessionId: string;
  model: string;
  cwd: string;
  systemPrompt?: string;
  permissionMode: "bypassPermissions" | "acceptEdits" | "default";
  resume?: boolean;
  extraArgs?: string[];
}

// shell:true Windows'ta cmd.exe'ye düşer ve newline içeren argümanları (sistem
// prompt gibi) parse ederken siler — sonraki bayraklar (--mcp-config dahil)
// yutulur. Bu yüzden claude.exe'yi doğrudan çağırıyoruz, shell:false.
let cachedClaudePath: string | undefined;
function resolveClaudeBin(hint: string): string {
  if (cachedClaudePath) return cachedClaudePath;
  // env veya çağrı default'ı tam path ise direkt kullan
  if (hint.endsWith(".exe") && existsSync(hint)) {
    cachedClaudePath = hint;
    return hint;
  }
  // Yaygın Windows kurulum yolu
  const npmGlobal =
    process.env.APPDATA &&
    `${process.env.APPDATA}\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe`;
  if (npmGlobal && existsSync(npmGlobal)) {
    cachedClaudePath = npmGlobal;
    return npmGlobal;
  }
  // where komutuyla path lookup
  if (process.platform === "win32") {
    try {
      const out = execSync("where claude.exe", { encoding: "utf8" });
      const exe = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.endsWith(".exe"));
      if (exe && existsSync(exe)) {
        cachedClaudePath = exe;
        return exe;
      }
    } catch {
      /* fall through */
    }
  }
  // Son çare: hint'i olduğu gibi geri ver (POSIX'te claude PATH'te zaten bulunur)
  return hint;
}

export function spawnClaude(
  opts: SpawnOptions,
): ChildProcessWithoutNullStreams {
  const args: string[] = [
    "-p",
    "--output-format",
    "stream-json",
    "--input-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--model",
    opts.model,
    "--permission-mode",
    opts.permissionMode,
    "--add-dir",
    opts.cwd,
  ];

  // Session bağlama
  if (opts.resume) {
    args.push("--resume", opts.sessionId);
  } else {
    args.push("--session-id", opts.sessionId);
  }

  if (opts.systemPrompt) {
    args.push("--append-system-prompt", opts.systemPrompt);
  }

  if (opts.extraArgs?.length) {
    args.push(...opts.extraArgs);
  }

  // shell:false — Windows cmd.exe parse'ı newline'lı argümanları kesiyor (sistem
  // prompt + --mcp-config kombinasyonunda sonra gelen bayraklar kayboluyor).
  // Bunun yerine claude.exe'nin tam path'ini çözüp doğrudan spawn ediyoruz.
  const bin = resolveClaudeBin(opts.bin);
  const child = spawn(bin, args, {
    cwd: opts.cwd,
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      // claude CLI'nin TTY beklemesini engelle
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
  });

  return child as ChildProcessWithoutNullStreams;
}
