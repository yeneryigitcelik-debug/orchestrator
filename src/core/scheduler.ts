// Scheduler — DB'deki ScheduledJob kayıtlarını node-cron ile çalıştırır.
// 3 kind destekler:
//   - lead-message: Lead'e prompt yollar (autonomous turunda işlenir)
//   - create-task: backlog'a task ekler (Lead next_task ile alır)
//   - scan-repo: belirtilen repo'da scan başlatır
//
// Yalnız daemon process'inde çalışır.

import * as cron from "node-cron";
import { prisma } from "../lib/db";
import { pubsub } from "../lib/pubsub";
import { orchestrator } from "./orchestrator";
import {
  addTask,
  listScheduledJobs,
  recordScheduledRun,
  upsertScheduledJob,
} from "./autonomous-store";
import { startScan } from "./scan";
import { lintMemory } from "./memory-store";
import { listProjectWikis } from "./memory-prompt";

interface JobEntry {
  id: string;
  task: cron.ScheduledTask;
  cronExpr: string;
}

class Scheduler {
  private jobs = new Map<string, JobEntry>();
  private booted = false;

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    await this.seedDefaults();
    await this.reload();
    // DB değişikliklerini izle
    pubsub.subscribe("autonomous", (raw) => {
      const ev = raw as { type?: string };
      if (ev?.type === "schedule.updated" || ev?.type === "schedule.deleted") {
        this.reload().catch((err) => {
          console.error("[scheduler] reload failed", err);
        });
      }
    });
  }

  /** İlk boot'ta varsayılan job'ları ekler (idempotent — varsa dokunmaz, kullanıcı silebilir/kapatabilir). */
  private async seedDefaults(): Promise<void> {
    try {
      const name = "nightly-memory-lint";
      const existing = await prisma.scheduledJob.findFirst({ where: { name } });
      if (existing) return;
      await upsertScheduledJob({
        name,
        cron: "0 4 * * *",
        prompt:
          "Aktif projelerin .agentwiki hafızasını denetle (orphan/bayat/gap) + eski working/ buda.",
        kind: "memory-lint",
        enabled: true,
      });
      console.log("[scheduler] seed: nightly-memory-lint (her gün 04:00) eklendi");
    } catch (err) {
      console.error("[scheduler] seedDefaults hata:", err);
    }
  }

  /** Tüm zamanlanmış job'ları DB'den okuyup kaydeder. Mevcutları durdurup yeniden bağlar. */
  async reload(): Promise<void> {
    const jobs = await listScheduledJobs();
    const wantIds = new Set(jobs.map((j) => j.id));

    // Artık olmayan veya enabled değişen job'ları durdur
    for (const [id, entry] of this.jobs) {
      const fresh = jobs.find((j) => j.id === id);
      if (!fresh || !fresh.enabled || fresh.cron !== entry.cronExpr) {
        entry.task.stop();
        this.jobs.delete(id);
      }
    }

    // Yeni veya değişmiş aktif job'ları başlat
    for (const job of jobs) {
      if (!job.enabled) continue;
      if (this.jobs.has(job.id)) continue;
      if (!cron.validate(job.cron)) {
        console.error(`[scheduler] geçersiz cron: ${job.name} → ${job.cron}`);
        continue;
      }
      try {
        const task = cron.schedule(
          job.cron,
          () => {
            this.executeJob(job.id).catch((err) => {
              console.error(`[scheduler] ${job.name} hata:`, err);
            });
          },
          { timezone: process.env.TZ ?? "Europe/Istanbul" },
        );
        task.start();
        this.jobs.set(job.id, { id: job.id, task, cronExpr: job.cron });
      } catch (err) {
        console.error(`[scheduler] ${job.name} başlatılamadı:`, err);
      }
    }

    // Pubsub'a state özeti yolla
    pubsub.publish("autonomous", {
      type: "schedule.state",
      activeJobs: [...this.jobs.keys()],
      ts: Date.now(),
    });
    if (jobs.length > 0) {
      console.log(
        `[scheduler] ${this.jobs.size}/${jobs.length} job aktif`,
      );
    }
    wantIds; // lint guard
  }

  /** Cron fire ettiğinde çağrılır — DB'den taze oku, kind'a göre yürüt. */
  private async executeJob(id: string): Promise<void> {
    const job = await prisma.scheduledJob.findUnique({ where: { id } });
    if (!job || !job.enabled) return;
    console.log(`[scheduler] ▶ ${job.name} (${job.kind}) yürütülüyor`);
    try {
      switch (job.kind) {
        case "lead-message": {
          const lead = orchestrator.getLead();
          if (!lead) throw new Error("Lead yok");
          await orchestrator.send(
            lead.id,
            `[ZAMANLAYICI: ${job.name}]\n${job.prompt}`,
          );
          break;
        }
        case "create-task": {
          const payload = job.payload ? JSON.parse(job.payload) : {};
          await addTask({
            title: payload.title ?? job.name,
            description: job.prompt,
            priority: payload.priority ?? 5,
            source: "scheduler",
            cwd: payload.cwd ?? null,
            goal: payload.goal ?? null,
          });
          break;
        }
        case "scan-repo": {
          const payload = job.payload ? JSON.parse(job.payload) : {};
          if (!payload.repo) throw new Error("scan-repo için payload.repo gerekli");
          await startScan({
            repo: payload.repo,
            roles: payload.roles,
            skills: payload.skills,
          });
          break;
        }
        case "memory-lint": {
          const projects = await listProjectWikis();
          let findings = 0;
          let promotions = 0;
          for (const p of projects) {
            try {
              const r = await lintMemory(p.cwd);
              findings += r.orphans.length + r.stale.length + r.gaps.length;
              promotions += r.promotions.length;
            } catch {
              /* tek proje hatası diğerlerini durdurmasın */
            }
          }
          pubsub.publish("memory", {
            type: "memory.lint.scheduled",
            projects: projects.length,
            findings,
            promotions,
            ts: Date.now(),
          });
          break;
        }
        default:
          throw new Error(`Bilinmeyen kind: ${job.kind}`);
      }
      await recordScheduledRun(id, true);
      pubsub.publish("autonomous", {
        type: "schedule.fired",
        jobId: id,
        name: job.name,
        ok: true,
        ts: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordScheduledRun(id, false, message);
      pubsub.publish("autonomous", {
        type: "schedule.fired",
        jobId: id,
        name: job.name,
        ok: false,
        error: message,
        ts: Date.now(),
      });
      console.error(`[scheduler] ${job.name} başarısız:`, message);
    }
  }

  shutdown(): void {
    for (const entry of this.jobs.values()) {
      try {
        entry.task.stop();
      } catch {
        /* yoksay */
      }
    }
    this.jobs.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __scheduler: Scheduler | undefined;
}

export const scheduler: Scheduler = globalThis.__scheduler ?? new Scheduler();

if (process.env.NODE_ENV !== "production") {
  globalThis.__scheduler = scheduler;
}
