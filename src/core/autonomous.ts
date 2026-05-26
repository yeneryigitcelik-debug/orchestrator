// AutonomousController — Lead'i autonomous moddayken kendi kendine sürer.
// Çekirdek mantığı: Lead idle olduğunda tick atar, "next iteration" mesajı yollar,
// iteration sayar, checkpointEvery'de checkpoint zorlar, maxIterations'a çarpınca durdurur.
//
// SADECE daemon process'inde çalışır. orchestrator + autonomous-store + pubsub kullanır.

import { prisma } from "../lib/db";
import { pubsub } from "../lib/pubsub";
import { orchestrator } from "./orchestrator";
import {
  bumpRunIterations,
  endRun,
  getConfig,
  getCurrentRun,
  logThought,
  setConfig,
  startRun,
  type AutonomousConfig,
} from "./autonomous-store";
import { expireOldQuestions } from "./questions";

const LEAD_IDLE_SETTLE_MS = 6_000; // Lead son aktivitesinden bu kadar sonra "idle" sayılır
const MIN_TICK_GAP_MS = 12_000; // ardışık iki tick mesajı arası min süre

interface ControllerState {
  pausedSince: number | null;
  pauseReason: string | null;
  lastTickSentAt: number;
  lastEvalAt: number;
  driftStreak: number; // ardışık aynı pattern fikir sayısı
}

class AutonomousController {
  private state: ControllerState = {
    pausedSince: null,
    pauseReason: null,
    lastTickSentAt: 0,
    lastEvalAt: 0,
    driftStreak: 0,
  };

  private timer: NodeJS.Timeout | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;
  private booted = false;
  private currentInterval = 30_000;
  private leadRestartAttempts = 0;
  private leadRestartCooldownUntil = 0;

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    // Pubsub'a abone ol — checkpoint/config event'lerine tepki ver
    pubsub.subscribe("autonomous", (raw) => {
      const ev = raw as { type?: string; reason?: string };
      if (!ev?.type) return;
      switch (ev.type) {
        case "checkpoint.requested":
          this.pause("checkpoint");
          break;
        case "run.ended":
          this.stopTimer();
          this.state.driftStreak = 0;
          break;
        case "run.started":
          this.state.driftStreak = 0;
          void this.maybeStartTimer();
          break;
        case "controller.resumed":
          this.state.pausedSince = null;
          this.state.pauseReason = null;
          break;
        case "task.added": {
          // Drift detection: ardışık lead-ideation task'ları sayalım — ileride pattern matching ekleyeceğiz
          const task = (raw as { task?: { source?: string } }).task;
          if (task?.source === "lead-ideation") {
            this.state.driftStreak += 1;
            if (this.state.driftStreak >= 5) {
              void this.triggerDriftAlarm();
              this.state.driftStreak = 0;
            }
          } else {
            this.state.driftStreak = 0;
          }
          break;
        }
        case "task.completed":
          this.state.driftStreak = 0;
          break;
        case "config.updated": {
          const cfg = (raw as { config?: AutonomousConfig }).config;
          if (cfg?.tickIntervalMs && cfg.tickIntervalMs !== this.currentInterval) {
            this.restartTimer(cfg.tickIntervalMs);
          }
          if (cfg && !cfg.autonomousMode) {
            this.stopTimer();
          }
          if (cfg?.autonomousMode) {
            void this.maybeStartTimer();
          }
          break;
        }
      }
    });

    // Boot'ta autonomousMode true ise loop'u başlat
    const cfg = await getConfig();
    this.currentInterval = cfg.tickIntervalMs;
    if (cfg.autonomousMode) {
      // Eski "running" run varsa ona devam et, yoksa yeni başlat
      const existing = await getCurrentRun();
      if (!existing || existing.endedAt) {
        await startRun("user");
      }
      this.startTimer(cfg.tickIntervalMs);
    }

    // Periyodik bakım: timeout olmuş soruları kapat, asılı durumları temizle
    this.sweepTimer = setInterval(() => {
      this.sweep().catch((err) => {
        console.error("[autonomous] sweep failed", err);
      });
    }, 60_000);
  }

  /** Daemon shutdown'da çağrılır — interval'ları temizle. */
  shutdown(): void {
    this.stopTimer();
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  /** Asılı/eski kayıtları periyodik olarak temizle. */
  private async sweep(): Promise<void> {
    const expired = await expireOldQuestions();
    if (expired > 0) {
      console.log(`[autonomous] sweep: ${expired} soru timeout`);
    }
  }

  /** Telegram/UI'dan tetiklenir — run başlat ve döngüye gir. */
  async startAutonomous(triggeredBy: "user" | "scheduler" | "telegram" = "user") {
    const existing = await getCurrentRun();
    if (existing && !existing.endedAt) {
      await setConfig({ autonomousMode: true });
      this.state.pausedSince = null;
      this.state.pauseReason = null;
      await this.maybeStartTimer();
      return existing;
    }
    const run = await startRun(triggeredBy);
    await setConfig({ autonomousMode: true });
    this.state.pausedSince = null;
    this.state.pauseReason = null;
    pubsub.publish("autonomous", { type: "run.started", run, ts: Date.now() });
    await this.maybeStartTimer();
    return run;
  }

  /** Run'ı kapat, autonomousMode off. */
  async stopAutonomous(reason = "user-stop", summary?: string) {
    await setConfig({ autonomousMode: false });
    this.stopTimer();
    const current = await getCurrentRun();
    let ended = null;
    if (current && !current.endedAt) {
      ended = await endRun(current.id, reason, summary);
    }
    pubsub.publish("autonomous", { type: "run.ended", run: ended, reason, ts: Date.now() });
    return ended;
  }

  /** Kullanıcı checkpoint sonrası "devam et" dedi. */
  resume(): void {
    this.state.pausedSince = null;
    this.state.pauseReason = null;
    pubsub.publish("autonomous", { type: "controller.resumed", ts: Date.now() });
  }

  pause(reason: string): void {
    if (this.state.pausedSince) return;
    this.state.pausedSince = Date.now();
    this.state.pauseReason = reason;
    pubsub.publish("autonomous", {
      type: "controller.paused",
      reason,
      ts: Date.now(),
    });
  }

  getState() {
    return {
      paused: !!this.state.pausedSince,
      pauseReason: this.state.pauseReason,
      pausedSince: this.state.pausedSince,
      driftStreak: this.state.driftStreak,
      lastTickSentAt: this.state.lastTickSentAt,
      booted: this.booted,
      timerActive: !!this.timer,
    };
  }

  private async maybeStartTimer() {
    const cfg = await getConfig();
    if (!cfg.autonomousMode) {
      this.stopTimer();
      return;
    }
    if (!this.timer) this.startTimer(cfg.tickIntervalMs);
  }

  private startTimer(intervalMs: number) {
    this.stopTimer();
    this.currentInterval = intervalMs;
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error("[autonomous] tick failed", err);
      });
    }, intervalMs);
    // İlk tick'i hızlandır — boot sonrası beklemek istemiyoruz
    setTimeout(() => {
      this.tick().catch(() => {});
    }, 2_000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restartTimer(intervalMs: number) {
    if (!this.timer) return;
    this.startTimer(intervalMs);
  }

  /** Tek bir tick: koşulları kontrol et, gerekiyorsa Lead'e prompt yolla. */
  private async tick(): Promise<void> {
    this.state.lastEvalAt = Date.now();

    const cfg = await getConfig();
    if (!cfg.autonomousMode) {
      this.stopTimer();
      return;
    }
    if (this.state.pausedSince) return;

    // Tick mesajları arası minimum boşluk
    if (Date.now() - this.state.lastTickSentAt < MIN_TICK_GAP_MS) return;

    const leadSnapshot = orchestrator.getLead();
    if (!leadSnapshot) {
      // Lead bulunamadı — ensureLead tetikle (cooldown ile)
      await this.tryRestartLead();
      return;
    }
    const lead = orchestrator.get(leadSnapshot.id);
    if (!lead) {
      await this.tryRestartLead();
      return;
    }

    // Lead halen düşünüyor → bekle
    if (lead.status === "thinking" || lead.status === "starting") return;
    if (lead.status === "crashed" || lead.status === "stopped") {
      // Lead öldü → ensureLead tetikle, başaramazsa autonomous'u durdur
      const restarted = await this.tryRestartLead();
      if (!restarted) await this.stopAutonomous("lead-down");
      return;
    }
    // Lead canlı — restart sayacını sıfırla
    this.leadRestartAttempts = 0;

    // Lead son aktivitesinden bu yana yeterince zaman geçti mi?
    const lastMsgAt = lead.lastMessageAt?.getTime() ?? 0;
    if (lastMsgAt && Date.now() - lastMsgAt < LEAD_IDLE_SETTLE_MS) return;

    // Mevcut run'ı al, iteration/max kontrol
    const runId = cfg.currentRunId;
    if (!runId) {
      // Mode true ama run yok — boot race condition; düzelt
      await startRun("user");
      return;
    }
    const run = await prisma.autonomousRun.findUnique({ where: { id: runId } });
    if (!run) {
      await setConfig({ currentRunId: null });
      return;
    }
    if (run.endedAt) {
      await setConfig({ autonomousMode: false, currentRunId: null });
      this.stopTimer();
      return;
    }

    const nextIter = run.iterations + 1;

    // Max iterations
    if (nextIter > cfg.maxIterations) {
      await this.stopAutonomous("iter-cap", `maxIterations (${cfg.maxIterations}) doldu`);
      pubsub.publish("autonomous", {
        type: "iter.cap.hit",
        iteration: run.iterations,
        cap: cfg.maxIterations,
        ts: Date.now(),
      });
      return;
    }

    // Checkpoint zamanı mı?
    const isCheckpointTurn =
      nextIter > 1 && (nextIter - 1) % cfg.checkpointEvery === 0;

    const promptLines = [
      `[AUTONOMOUS ITER ${nextIter}/${cfg.maxIterations}]`,
      "",
    ];
    if (isCheckpointTurn) {
      promptLines.push(
        "CHECKPOINT TURU. Yeni iş yapmadan ÖNCE şunu yap:",
        "1. recall_thoughts(limit=15) ile son düşüncelerini oku",
        "2. Son iterasyonlarda ne yapıldı, sapma var mı değerlendir",
        "3. request_checkpoint(summary) ile 3-6 cümle özet ver",
        "Özet sonrası DUR — kullanıcı 'devam et' diyene kadar başka iş yapma.",
      );
    } else {
      promptLines.push(
        "Yeni autonomous tur. Sıra:",
        "1. autonomous_status oku → kaçıncı iter, checkpoint yakın mı?",
        "2. recall_thoughts(limit=10) → son düşüncelerini hatırla, drift yok mu?",
        "3. next_task → backlog'tan iş çek (varsa)",
        "   - Task varsa: log_thought type=plan ile planını yaz, yap, complete_task",
        "   - Task yoksa: ideation turu — projeyi tara, add_task ile yeni iş üret",
        "4. Her tool çağrısından ÖNCE log_thought type=rationale ile niyetini yaz",
      );
    }
    const prompt = promptLines.join("\n");

    try {
      lead.send(prompt);
      await bumpRunIterations(runId);
      this.state.lastTickSentAt = Date.now();
      pubsub.publish("autonomous", {
        type: "iter.advanced",
        iteration: nextIter,
        runId,
        checkpoint: isCheckpointTurn,
        ts: Date.now(),
      });
    } catch (err) {
      console.error("[autonomous] tick send failed", err);
      pubsub.publish("autonomous", {
        type: "iter.error",
        error: err instanceof Error ? err.message : String(err),
        ts: Date.now(),
      });
    }
  }

  /**
   * Lead bulunamadıysa veya çöktüyse yeniden ayağa kaldırmayı dene.
   * Cooldown: 30sn içinde 3 deneme — sonra vazgeç (autonomous durdurulur).
   */
  private async tryRestartLead(): Promise<boolean> {
    const now = Date.now();
    if (now < this.leadRestartCooldownUntil) return false;
    if (this.leadRestartAttempts >= 3) {
      console.error(
        "[autonomous] Lead 3 kez restart edildi ama ayakta kalmıyor — pes ediyorum",
      );
      return false;
    }
    this.leadRestartAttempts += 1;
    this.leadRestartCooldownUntil = now + 30_000;
    try {
      console.log(
        `[autonomous] Lead restart deneniyor (${this.leadRestartAttempts}/3)...`,
      );
      await orchestrator.ensureLead();
      pubsub.publish("autonomous", {
        type: "lead.restarted",
        attempt: this.leadRestartAttempts,
        ts: Date.now(),
      });
      return true;
    } catch (err) {
      console.error("[autonomous] Lead restart failed", err);
      return false;
    }
  }

  /** Lead 5+ ardışık ideation-task ürettiyse → drift uyarısı, otomatik checkpoint. */
  private async triggerDriftAlarm(): Promise<void> {
    const cfg = await getConfig();
    const message =
      "5+ ardışık lead-ideation task üretildi — orijinal hedeften sapma riski. " +
      "Önceki kararları gözden geçir ve kullanıcı onayı iste.";
    await logThought({
      content: message,
      type: "drift-alarm",
      runId: cfg.currentRunId ?? undefined,
    });
    pubsub.publish("autonomous", {
      type: "drift.alarm",
      message,
      ts: Date.now(),
    });
    this.pause("drift");
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __autonomousController: AutonomousController | undefined;
}

export const autonomousController: AutonomousController =
  globalThis.__autonomousController ?? new AutonomousController();

if (process.env.NODE_ENV !== "production") {
  globalThis.__autonomousController = autonomousController;
}
