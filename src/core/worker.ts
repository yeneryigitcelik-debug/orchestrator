// Worker = bir Claude Code oturumunun canlı sarmalayıcısı.
// Lifecycle: starting → running → (thinking|running)* → stopped|crashed
// Otonom mod: goal atandığında, her result event'inden sonra DONE marker yoksa
// orchestrator otomatik "devam et" mesajı yollar.

import { EventEmitter } from "node:events";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { spawnClaude } from "./spawner";
import { StreamJSONParser } from "./stream";
import type {
  SDKMessage,
  StreamInputMessage,
  WorkerConfig,
  WorkerStatus,
} from "./types";

// DONE / GÖREV BİTTİ benzeri marker'lar — büyük/küçük harf duyarsız.
// orchestrator deterministik episode yakalamada da bunu kullanır → export.
export const DONE_MARKER =
  /\[DONE\]|\bGOREV BITTI\b|\bGÖREV BİTTİ\b|\bTASK COMPLETE\b|\bTAMAMLANDI\b/i;

// Otonom loop tavanı — env ile override edilebilir.
// Model `[DONE]` yazmayı unutursa veya stuck loop'a girerse Max kotanı korur.
const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 30);

// In-memory replay buffer tavanı — uzun otonom koşularda bellek sızdırmasın.
// Tam geçmiş yine DB'de (Message tablosu); bu yalnız SSE replay cache'i.
// İKİ tavan: event sayısı VE toplam byte. Hangisi önce dolarsa baştan eviction.
// Byte tavanı kritik — tek bir result/tool_result event'i MB'larca olabilir.
const MAX_BUFFER = 1000;
const MAX_BUFFER_BYTES = 6 * 1024 * 1024; // ~6 MB / worker

/** Event'in yaklaşık byte boyutu — buffer eviction muhasebesi için. */
function approxSize(ev: SDKMessage): number {
  try {
    return JSON.stringify(ev).length;
  } catch {
    return 0;
  }
}

export interface WorkerEvents {
  message: [SDKMessage];
  status: [WorkerStatus];
  stdout_raw: [string];
  stderr: [string];
  exit: [{ code: number | null; signal: NodeJS.Signals | null }];
  goal_changed: [{ goal: string | null; iteration: number }];
  auto_continue: [{ iteration: number; reason: "no_done_marker" }];
  iter_cap_hit: [{ iteration: number; cap: number }];
}

export class Worker extends EventEmitter<WorkerEvents> {
  readonly id: string;
  readonly config: WorkerConfig;
  status: WorkerStatus = "idle";
  sessionId: string;
  lastMessageAt?: Date;

  // Otonom durum
  goal: string | null = null;
  autonomous = true;
  iteration = 0;
  goalStartedAt?: Date;

  private child?: ChildProcessWithoutNullStreams;
  private parser = new StreamJSONParser();
  private buffer: SDKMessage[] = [];
  // buffer[i]'nin approxSize'ı — eviction'da byte muhasebesi için paralel tutulur.
  private bufferSizes: number[] = [];
  private bufferBytes = 0;

  constructor(config: WorkerConfig) {
    super();
    this.id = config.id;
    this.config = config;
    this.sessionId = config.sessionId ?? randomUUID();
  }

  async start(opts?: { resume?: boolean; bin?: string }): Promise<void> {
    if (this.child) throw new Error("Worker zaten çalışıyor");
    this.setStatus("starting");
    const child = spawnClaude({
      bin: opts?.bin ?? process.env.CLAUDE_BIN ?? "claude",
      sessionId: this.sessionId,
      model: this.config.model,
      cwd: this.config.cwd,
      systemPrompt: this.config.systemPrompt,
      permissionMode: this.config.permissionMode ?? "bypassPermissions",
      resume: opts?.resume ?? false,
      extraArgs: this.config.extraArgs,
    });
    this.child = child;
    this.attachStreams(child);
  }

  /** Worker'a (raw) kullanıcı mesajı gönder */
  send(text: string): void {
    if (!this.child?.stdin || this.child.stdin.destroyed) {
      throw new Error("Worker stdin kapalı");
    }
    const msg: StreamInputMessage = {
      type: "user",
      message: { role: "user", content: text },
    };
    this.child.stdin.write(JSON.stringify(msg) + "\n");
    this.setStatus("thinking");
  }

  /** Bir goal ata ve worker'ı kendi kendine işletmeye başla */
  assignGoal(goal: string): void {
    this.goal = goal;
    this.iteration = 0;
    this.goalStartedAt = new Date();
    this.emit("goal_changed", { goal, iteration: 0 });

    const intro = [
      "🎯 YENİ GÖREV:",
      goal,
      "",
      "Talimatlar:",
      "- Görevi bitene kadar üstünde çalış.",
      "- Her adımda yaptıklarını kısa özetle.",
      "- Görev TAMAMEN bittiğinde cevabının en sonuna `[DONE]` yaz.",
      "- Bitmediyse, sonuna [DONE] YAZMA — sistem seni otomatik tetikleyerek devam ettirecek.",
      "- Engellendin veya kullanıcıya soru sorman gerekiyorsa cevabının en sonuna `[BLOCKED] sebep` yaz.",
    ].join("\n");

    this.send(intro);
  }

  /** Goal'i iptal et, autonomous loop'u kes */
  clearGoal(): void {
    this.goal = null;
    this.iteration = 0;
    this.goalStartedAt = undefined;
    this.emit("goal_changed", { goal: null, iteration: 0 });
  }

  setAutonomous(value: boolean): void {
    this.autonomous = value;
  }

  async stop(timeoutMs = 5000): Promise<void> {
    if (!this.child) return;
    const child = this.child;
    return new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
      }, timeoutMs);
      child.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });
      try {
        child.stdin?.end();
        child.kill("SIGTERM");
      } catch {
        clearTimeout(killTimer);
        resolve();
      }
    });
  }

  history(): SDKMessage[] {
    return [...this.buffer];
  }

  private setStatus(s: WorkerStatus) {
    if (this.status === s) return;
    this.status = s;
    this.emit("status", s);
  }

  private attachStreams(child: ChildProcessWithoutNullStreams) {
    // claude `-p --input-format stream-json` ilk girdiye kadar event yaymaz;
    // 'spawn' = OS process'i ayağa kalktı → worker canlı ve mesaja açık.
    child.on("spawn", () => {
      if (this.status === "starting") this.setStatus("running");
    });
    child.stdout.on("data", (chunk: Buffer) => {
      this.emit("stdout_raw", chunk.toString("utf8"));
      const events = this.parser.push(chunk);
      for (const ev of events) this.handleEvent(ev);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      this.emit("stderr", chunk.toString("utf8"));
    });
    child.on("error", (err) => {
      this.emit("stderr", `spawn error: ${err.message}`);
      this.setStatus("crashed");
    });
    child.on("exit", (code, signal) => {
      for (const ev of this.parser.drain()) this.handleEvent(ev);
      this.emit("exit", { code, signal });
      this.setStatus(code === 0 ? "stopped" : "crashed");
      this.child = undefined;
    });
  }

  private handleEvent(ev: SDKMessage) {
    this.lastMessageAt = new Date();

    // Replay buffer'a ekle + iki tavanı (sayı, byte) zorla. En eskiyi at.
    // DB'ye giden tam event emit("message") ile gider — burada kırpma yok,
    // yalnız in-memory cache sınırlanır.
    this.buffer.push(ev);
    this.bufferSizes.push(approxSize(ev));
    this.bufferBytes += this.bufferSizes[this.bufferSizes.length - 1];
    while (
      this.buffer.length > 1 &&
      (this.buffer.length > MAX_BUFFER || this.bufferBytes > MAX_BUFFER_BYTES)
    ) {
      this.buffer.shift();
      this.bufferBytes -= this.bufferSizes.shift() ?? 0;
    }

    this.emit("message", ev);

    // Resume modunda 'system/init' tetiklenmiyor — herhangi bir event geldiğinde
    // worker'ın canlı olduğunu varsay.
    if (this.status === "starting") {
      this.setStatus("running");
    }

    if (
      ev.type === "system" &&
      (ev as { subtype?: string }).subtype === "init"
    ) {
      const sid = (ev as { session_id?: string }).session_id;
      if (sid) this.sessionId = sid;
      this.setStatus("running");
      return;
    }

    if (ev.type === "assistant" && this.status === "thinking") {
      this.setStatus("running");
      return;
    }

    if (ev.type === "result") {
      this.setStatus("running"); // hazır, yeni mesaja açık
      this.maybeAutoContinue(ev as { result?: string; subtype?: string });
    }
  }

  private maybeAutoContinue(ev: { result?: string; subtype?: string }): void {
    if (!this.autonomous) return;
    if (!this.goal) return;
    if (ev.subtype !== "success") return; // hata varsa loop'lama

    const text = ev.result ?? "";
    if (DONE_MARKER.test(text)) {
      // Görev bitti — goal temizle
      this.goal = null;
      this.goalStartedAt = undefined;
      this.emit("goal_changed", { goal: null, iteration: this.iteration });
      return;
    }

    if (/\[BLOCKED\]/i.test(text)) {
      // engellenmiş — loop'u kendiliğinden durdur
      this.emit("goal_changed", { goal: this.goal, iteration: this.iteration });
      return;
    }

    if (this.iteration + 1 >= MAX_ITERATIONS) {
      this.emit("iter_cap_hit", {
        iteration: this.iteration + 1,
        cap: MAX_ITERATIONS,
      });
      this.goal = null;
      this.goalStartedAt = undefined;
      this.emit("goal_changed", { goal: null, iteration: this.iteration });
      return;
    }

    this.iteration += 1;
    this.emit("auto_continue", {
      iteration: this.iteration,
      reason: "no_done_marker",
    });

    // Bir sonraki turn'i tetikle
    try {
      this.send(
        `Görevin hâlâ bitmedi. Devam et. Bittiyse [DONE], engellendiysen [BLOCKED] sebep yaz.`,
      );
    } catch (err) {
      this.emit("stderr", `auto-continue send failed: ${String(err)}`);
    }
  }
}
