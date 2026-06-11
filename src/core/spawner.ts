// Düşük seviyeli claude CLI subprocess başlatıcı.
// Worker class bunu sarmalar; burası saf I/O katmanı.

import { spawn, execSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  // --- Windows çözümü (mevcut davranış aynen korunur) ---
  if (process.platform === "win32") {
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
    // Son çare: hint'i olduğu gibi geri ver
    return hint;
  }

  // --- macOS / Linux çözümü ---
  // CLAUDE_BIN env'i tam path ise direkt kullan
  const envBin = process.env.CLAUDE_BIN;
  if (envBin && existsSync(envBin)) {
    cachedClaudePath = envBin;
    return envBin;
  }
  // which komutuyla PATH lookup
  try {
    const out = execSync("which claude", { encoding: "utf8" });
    const found = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
    if (found && existsSync(found)) {
      cachedClaudePath = found;
      return found;
    }
  } catch {
    /* fall through */
  }
  // Yaygın POSIX kurulum yolları
  const home = process.env.HOME ?? "";
  const candidates = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    home && `${home}/.npm-global/bin/claude`,
    home && `${home}/.local/bin/claude`,
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      cachedClaudePath = candidate;
      return candidate;
    }
  }
  // Son çare: bare "claude" — PATH çözsün
  return "claude";
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

  // Windows CreateProcessW komut satırını ~32767 UTF-16 karaktere sınırlar. Skill
  // yüklü roller (frontend ~64KB, backend ~58KB, devops/security ~55KB) systemPrompt'u
  // --append-system-prompt ile INLINE geçince bu sınır aşılıyor → spawn sessizce patlıyor,
  // worker 'starting'te takılı kalıyor (Lead bunu "goal string sınırı aştı" diye yanlış
  // teşhis ediyordu; goal zaten stdin'den gidiyor, argv'de değil). Çözüm: prompt'u geçici
  // dosyaya yaz, --append-system-prompt-file ile path geç → argv kısa kalır, sınır kalkar.
  let promptFile: string | undefined;
  if (opts.systemPrompt) {
    try {
      const dir = join(tmpdir(), "orchestrator-prompts");
      mkdirSync(dir, { recursive: true });
      promptFile = join(dir, `sys-${opts.sessionId}-${Date.now()}.txt`);
      writeFileSync(promptFile, opts.systemPrompt, "utf8");
      args.push("--append-system-prompt-file", promptFile);
    } catch {
      // Dosyaya yazılamazsa eski davranışa düş — kısa prompt'lar yine çalışır.
      promptFile = undefined;
      args.push("--append-system-prompt", opts.systemPrompt);
    }
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

  // Geçici prompt dosyasını worker ölünce temizle — CLI onu başlangıçta okur,
  // sonra gerekmez. (Kaçırılırsa os tmpdir'de küçük dosya kalır, zararsız.)
  if (promptFile) {
    const f = promptFile;
    child.once("exit", () => {
      try {
        unlinkSync(f);
      } catch {
        /* zaten silinmiş */
      }
    });
  }

  return child as ChildProcessWithoutNullStreams;
}
