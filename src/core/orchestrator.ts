// Orchestrator: worker havuzu yöneticisi. Singleton.
// Watcher rolü: bu role mesaj atıldığında diğer worker'ların state özeti otomatik prepend edilir.

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { Worker } from "./worker";
import type { SDKMessage, WorkerConfig, WorkerRole } from "./types";
import { prisma } from "../lib/db";
import { pubsub } from "../lib/pubsub";
import { buildLeadSpawnRequest } from "./lead";
import { ROLE_PRESETS } from "./role-prompts";
import { buildSkillPrompt } from "./skills";

// İki worker aynı dosya/git ağacında çakışmasın diye normalize edip karşılaştırıyoruz.
// Windows case-insensitive, slash karışıklığı yaygın.
function normalizeCwd(p: string): string {
  return resolvePath(p).replace(/\\/g, "/").toLowerCase();
}

export interface SpawnRequest {
  name: string;
  role: WorkerRole;
  model: string;
  cwd: string;
  systemPrompt?: string;
  permissionMode?: "bypassPermissions" | "acceptEdits" | "default";
  resumeSessionId?: string;
  goal?: string;
  autonomous?: boolean;
  extraArgs?: string[];
  /** Review rolleri için: yüklenecek skill alt-kümesi. Boş = rolün tüm skill'leri. */
  skills?: string[];
  /** Review worker'ları salt-okuma — aynı repo'da paralel taramaya izin ver. */
  allowSharedCwd?: boolean;
}

export interface WorkerSnapshot {
  id: string;
  name: string;
  role: WorkerRole;
  model: string;
  cwd: string;
  sessionId: string;
  status: string;
  goal: string | null;
  iteration: number;
  autonomous: boolean;
  goalStartedAt?: string;
  lastMessageAt?: string;
  messageCount: number;
}

class Orchestrator {
  private workers = new Map<string, Worker>();

  list(): WorkerSnapshot[] {
    return [...this.workers.values()].map((w) => this.toSnapshot(w));
  }

  get(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  async spawn(req: SpawnRequest): Promise<WorkerSnapshot> {
    // cwd çakışma kontrolü: aktif worker'lardan biri aynı dizinde mi?
    // Stopped/crashed olanları atla, gerçek canlı olanlara bak.
    // Review worker'ları salt-okuma yapar → allowSharedCwd ile bu kontrol atlanır.
    if (!req.allowSharedCwd) {
      const targetCwd = normalizeCwd(req.cwd);
      for (const w of this.workers.values()) {
        if (w.status === "stopped" || w.status === "crashed") continue;
        if (normalizeCwd(w.config.cwd) === targetCwd) {
          throw new Error(
            `cwd çakışması: '${w.config.name}' (${w.status}) zaten bu dizinde çalışıyor → ${w.config.cwd}`,
          );
        }
      }
    }

    const id = randomUUID();
    const sessionId = req.resumeSessionId ?? randomUUID();

    // systemPrompt verilmediyse role default'unu kullan (Lead bunu spawn_helper
    // çağırırken systemPrompt geçmiyor; rol disiplini bu sayede otomatik gelir).
    // Lead için bu zaten lead.ts'te dolu olarak geliyor.
    let resolvedSystemPrompt =
      req.systemPrompt ?? ROLE_PRESETS[req.role]?.systemPrompt;

    // Rolün skill kütüphanesini system prompt'a ekle (skills/<role>/*.md).
    // Review rolleri scan modunda alt-küme (req.skills) ister; skill klasörü
    // olmayan roller için buildSkillPrompt boş string döner — zararsız.
    resolvedSystemPrompt =
      (resolvedSystemPrompt ?? "") + buildSkillPrompt(req.role, req.skills);

    const config: WorkerConfig = {
      id,
      name: req.name,
      role: req.role,
      model: req.model,
      cwd: req.cwd,
      systemPrompt: resolvedSystemPrompt,
      permissionMode: req.permissionMode ?? "bypassPermissions",
      sessionId,
      extraArgs: req.extraArgs,
    };

    const worker = new Worker(config);
    if (req.autonomous === false) worker.setAutonomous(false);
    this.workers.set(id, worker);

    await prisma.worker.create({
      data: {
        id,
        name: req.name,
        role: req.role,
        model: req.model,
        cwd: req.cwd,
        sessionId,
        status: "starting",
        autonomous: worker.autonomous,
      },
    });

    this.attachPersistence(worker);

    // cwd yoksa oluştur — claude subprocess var olmayan dizinde spawn olamaz.
    try {
      mkdirSync(req.cwd, { recursive: true });
    } catch {
      /* zaten var / izin yok — worker.start() gerçek hatayı yüzeye taşır */
    }

    await worker.start({ resume: !!req.resumeSessionId });

    if (req.goal) {
      worker.assignGoal(req.goal);
    }

    return this.toSnapshot(worker);
  }

  /**
   * Daemon başlangıcında DB'den ölmemiş worker'ları geri yükle.
   * `--resume sessionId` ile claude CLI'den session dosyasını yeniden oku.
   * Eğer session dosyası kaybolmuşsa CLI hata verir → worker 'crashed' olur, kullanıcı görür.
   */
  async restoreFromDB(): Promise<{ restored: number; skipped: number }> {
    if (this.workers.size > 0) {
      return { restored: 0, skipped: 0 }; // zaten doluyuz (HMR)
    }

    // Sadece daemon kapanırken canlı olan worker'ları diriltt — 'stopped' (manuel kill),
    // 'crashed' (zaten çökmüş) ve 'starting' (hiç tam canlanmadı) atla.
    // Lead role'ünü atlıyoruz — onu ensureLead() özel olarak ele alıyor (extraArgs/MCP config gerekiyor).
    const rows = await prisma.worker.findMany({
      where: {
        status: { in: ["running", "thinking"] },
        NOT: { role: "lead" },
      },
      orderBy: { createdAt: "asc" },
    });

    let restored = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.sessionId) {
        skipped++;
        continue;
      }
      try {
        const config: WorkerConfig = {
          id: row.id,
          name: row.name,
          role: row.role as WorkerRole,
          model: row.model,
          cwd: row.cwd,
          permissionMode: "bypassPermissions",
          sessionId: row.sessionId,
        };
        const worker = new Worker(config);
        worker.setAutonomous(row.autonomous);
        if (row.goal) {
          // Goal state'i geri yükle ama otomatik tetikleme yapma —
          // bir sonraki result event'i (ya da kullanıcı mesajı) loop'u devam ettirir
          worker.goal = row.goal;
          worker.iteration = row.iteration;
          if (row.goalStartedAt) worker.goalStartedAt = row.goalStartedAt;
        }
        this.workers.set(row.id, worker);
        this.attachPersistence(worker);
        await worker.start({ resume: true });
        restored++;

        // Eğer goal var ve otonom moddaysa, başlangıçta bir uyandırma mesajı yolla
        // (claude CLI resume'da hemen cevap üretmez, dış mesaj bekler)
        if (worker.goal && worker.autonomous) {
          // 1.5 sn bekle, init event'i otursun, sonra "devam et" gönder
          setTimeout(() => {
            try {
              worker.send(
                `[SERVIS YENIDEN BASLADI] Görevin hala bitmedi. Devam et. Bittiyse [DONE], engellendiysen [BLOCKED] sebep yaz.`,
              );
            } catch {}
          }, 1500);
        }
      } catch (err) {
        console.error(`[orchestrator] restore failed for ${row.id}`, err);
        await prisma.worker
          .update({
            where: { id: row.id },
            data: { status: "crashed" },
          })
          .catch(() => {});
        skipped++;
      }
    }

    if (restored + skipped > 0) {
      console.log(
        `[orchestrator] restored=${restored} skipped=${skipped} from DB`,
      );
    }
    return { restored, skipped };
  }

  /**
   * Lead'i garantile — aktifse hiçbir şey yapma, yoksa fresh spawn.
   * Resume mantığı yok: claude session dosyası (~/.claude/projects/.../<id>.jsonl)
   * sıklıkla kaybolduğu için her boot'ta temiz Lead daha tutarlı. Kullanıcı
   * chat geçmişini Lead'in kafasında değil, DB'deki Message tablosunda görür.
   */
  async ensureLead(): Promise<WorkerSnapshot> {
    // 1. Aktif Lead var mı (memory)?
    for (const w of this.workers.values()) {
      if (w.config.role === "lead") {
        return this.toSnapshot(w);
      }
    }

    // 2. DB'deki eski Lead row'larını temizle — fresh spawn ediyoruz
    //    (cwd çakışma kontrolünü patlatmaması için memory'deki ölü kayıtlar da silinmiş olur)
    await prisma.worker.deleteMany({ where: { role: "lead" } });

    // 3. Fresh spawn
    const spawnReq = buildLeadSpawnRequest();
    const snapshot = await this.spawn(spawnReq);
    console.log(`[orchestrator] Lead spawn edildi: ${snapshot.id}`);
    return snapshot;
  }

  /** Lead snapshot'ı UI için — yoksa null. */
  getLead(): WorkerSnapshot | null {
    for (const w of this.workers.values()) {
      if (w.config.role === "lead") return this.toSnapshot(w);
    }
    return null;
  }

  async stop(id: string): Promise<void> {
    const worker = this.workers.get(id);
    if (!worker) return;
    // Lead'i normal stop'tan koru — kullanıcı kazara öldürmesin
    if (worker.config.role === "lead") {
      throw new Error("Lead worker stop edilemez (kalıcı). Restart için servis yeniden başlat.");
    }
    await worker.stop();
    this.workers.delete(id);
  }

  /** Daemon shutdown'da hepsini gracefully kapat — child process'leri sızdırma. */
  async shutdownAll(): Promise<void> {
    const all = [...this.workers.values()];
    if (all.length === 0) return;
    console.log(`[orchestrator] shutting down ${all.length} worker(s)...`);
    await Promise.all(
      all.map((w) =>
        w.stop().catch((err) => {
          console.error(`[orchestrator] stop failed for ${w.id}`, err);
        }),
      ),
    );
    this.workers.clear();
  }

  /** Worker'a kullanıcı mesajı (watcher rolüne otomatik state context prepend). */
  async send(id: string, text: string): Promise<void> {
    const worker = this.workers.get(id);
    if (!worker) throw new Error(`Worker bulunamadı: ${id}`);

    const finalText =
      worker.config.role === "watcher"
        ? `${this.buildWatcherContext(id)}\n\n--- KULLANICI SORUSU ---\n${text}`
        : text;

    worker.send(finalText);

    await prisma.message.create({
      data: {
        workerId: id,
        direction: "in",
        type: "user",
        payload: JSON.stringify({ text, augmented: finalText !== text }),
      },
    });

    pubsub.publish(id, {
      type: "_local_user_message",
      text,
      ts: Date.now(),
    });
  }

  /** Tüm aktif worker'lara aynı mesajı yolla */
  async broadcast(text: string): Promise<string[]> {
    const ids: string[] = [];
    for (const worker of this.workers.values()) {
      if (worker.status === "running" || worker.status === "thinking") {
        await this.send(worker.id, text);
        ids.push(worker.id);
      }
    }
    return ids;
  }

  async assignGoal(id: string, goal: string): Promise<void> {
    const worker = this.workers.get(id);
    if (!worker) throw new Error(`Worker bulunamadı: ${id}`);
    worker.assignGoal(goal);
  }

  async clearGoal(id: string): Promise<void> {
    const worker = this.workers.get(id);
    if (!worker) return;
    worker.clearGoal();
  }

  setAutonomous(id: string, value: boolean): void {
    const worker = this.workers.get(id);
    if (!worker) return;
    worker.setAutonomous(value);
    prisma.worker
      .update({ where: { id }, data: { autonomous: value } })
      .catch(() => {});
  }

  /** Watcher için diğer worker'ların durum özeti */
  private buildWatcherContext(watcherId: string): string {
    const others = [...this.workers.values()].filter((w) => w.id !== watcherId);
    if (others.length === 0) return "[Şu an gözetlenecek başka worker yok.]";

    const lines: string[] = [
      "=== AKTİF WORKER'LAR (gözetlemen için anlık durum) ===",
      "",
    ];
    for (const w of others) {
      lines.push(`- ${w.config.name} [${w.config.role}/${shortModel(w.config.model)}]`);
      lines.push(`  status: ${w.status}, iteration: ${w.iteration}`);
      lines.push(`  cwd: ${w.config.cwd}`);
      if (w.goal) {
        lines.push(`  goal: ${w.goal.slice(0, 200)}${w.goal.length > 200 ? "…" : ""}`);
        if (w.goalStartedAt) {
          const mins = Math.floor(
            (Date.now() - w.goalStartedAt.getTime()) / 60_000,
          );
          lines.push(`  goal süresi: ${mins} dakika`);
        }
      } else {
        lines.push(`  goal: (boşta)`);
      }

      // Son birkaç anlamlı event'i çıkar
      const recent = lastMeaningfulEvents(w.history(), 3);
      if (recent.length > 0) {
        lines.push(`  son aktiviteler:`);
        for (const r of recent) lines.push(`    • ${r}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  private toSnapshot(worker: Worker): WorkerSnapshot {
    return {
      id: worker.id,
      name: worker.config.name,
      role: worker.config.role,
      model: worker.config.model,
      cwd: worker.config.cwd,
      sessionId: worker.sessionId,
      status: worker.status,
      goal: worker.goal,
      iteration: worker.iteration,
      autonomous: worker.autonomous,
      goalStartedAt: worker.goalStartedAt?.toISOString(),
      lastMessageAt: worker.lastMessageAt?.toISOString(),
      messageCount: worker.history().length,
    };
  }

  private attachPersistence(worker: Worker) {
    worker.on("message", (ev: SDKMessage) => {
      this.persistMessage(worker.id, ev).catch((err) => {
        console.error("[orchestrator] persist failed", err);
      });
      pubsub.publish(worker.id, ev);
    });

    worker.on("status", (status) => {
      prisma.worker
        .update({
          where: { id: worker.id },
          data: { status, sessionId: worker.sessionId },
        })
        .catch((err) =>
          console.error("[orchestrator] status update failed", err),
        );
      pubsub.publish(worker.id, {
        type: "_local_status",
        status,
        ts: Date.now(),
      });
    });

    worker.on("goal_changed", ({ goal, iteration }) => {
      prisma.worker
        .update({
          where: { id: worker.id },
          data: {
            goal,
            iteration,
            goalStartedAt: worker.goalStartedAt ?? null,
          },
        })
        .catch(() => {});
      pubsub.publish(worker.id, {
        type: "_local_goal_changed",
        goal,
        iteration,
        ts: Date.now(),
      });
    });

    worker.on("auto_continue", ({ iteration }) => {
      pubsub.publish(worker.id, {
        type: "_local_auto_continue",
        iteration,
        ts: Date.now(),
      });
    });

    worker.on("iter_cap_hit", ({ iteration, cap }) => {
      pubsub.publish(worker.id, {
        type: "_local_iter_cap_hit",
        iteration,
        cap,
        ts: Date.now(),
      });
    });

    // Worker subprocess çıkınca map'ten temizle — yoksa cwd çakışma kontrolü
    // ve list() crashed/stopped worker'ları canlıymış gibi görür.
    worker.on("exit", (info) => {
      console.log(
        `[orchestrator] worker ${worker.config.name} (${worker.id.slice(0, 8)}) exit:`,
        info,
      );
      this.workers.delete(worker.id);
    });

    // claude subprocess'in stderr'ini server log'una taşı — debug için
    worker.on("stderr", (chunk) => {
      const s = chunk.trim();
      if (!s) return;
      console.error(`[worker:${worker.config.name}] ${s.slice(0, 500)}`);
    });
  }

  private async persistMessage(workerId: string, ev: SDKMessage) {
    await prisma.message.create({
      data: {
        workerId,
        direction: "out",
        type: ev.type,
        payload: JSON.stringify(ev),
      },
    });
  }
}

function shortModel(m: string): string {
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  return m.slice(0, 10);
}

function lastMeaningfulEvents(history: SDKMessage[], n: number): string[] {
  const out: string[] = [];
  // Sondan başa, anlamlı olanları topla
  for (let i = history.length - 1; i >= 0 && out.length < n; i--) {
    const ev = history[i] as { type?: string; message?: { content?: unknown[] }; subtype?: string; result?: string };
    if (ev.type === "assistant" && Array.isArray(ev.message?.content)) {
      const text = ev.message.content
        .filter((b): b is { type: "text"; text: string } => {
          const x = b as { type?: string };
          return x.type === "text";
        })
        .map((b) => b.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) out.push(`assistant: ${text.slice(0, 160)}${text.length > 160 ? "…" : ""}`);
    } else if (ev.type === "result") {
      out.push(`result/${ev.subtype}: ${(ev.result ?? "").slice(0, 120)}`);
    }
  }
  return out.reverse();
}

// Singleton bağlama
declare global {
  // eslint-disable-next-line no-var
  var __orchestrator: Orchestrator | undefined;
}

export const orchestrator: Orchestrator =
  globalThis.__orchestrator ?? new Orchestrator();

if (process.env.NODE_ENV !== "production") {
  globalThis.__orchestrator = orchestrator;
}
