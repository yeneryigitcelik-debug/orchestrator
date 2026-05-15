// Scan modu — bir repo'yu review ajanslarına paralel taratır.
// Her review rolü için autonomous=false bir worker spawn edilir, tek bir
// scan goal'i atanır, `result` event'i JSON finding'lere parse edilip DB'ye yazılır.

import { orchestrator } from "./orchestrator";
import { ROLE_PRESETS } from "./role-prompts";
import { REVIEW_ROLES, type WorkerRole, type SDKMessage } from "./types";
import { parseFindings } from "./finding-parser";
import { prisma } from "@/lib/db";
import { pubsub } from "@/lib/pubsub";

const SCAN_GOAL = `TARAMA GÖREVİ — bu dizindeki kod tabanını, sana yüklenen skill'lere göre TARA.

- Read / Glob / Grep ile incele. HİÇBİR dosyayı DEĞİŞTİRME, komutla bir şey kurma.
- Yüklü her skill bir kontrol kuralıdır — hepsini sırayla uygula.
- Çıktın SADECE bir JSON array olsun, başka hiçbir şey yazma:
  [{"severity":"critical|high|medium|low|info","rule":"kural","file":"yol","line":42,"why":"neden","fix":"nasil","evidence":"kod"}]
- Bulgu yoksa []. JSON'u yazdıktan sonra en sona [DONE] ekle.`;

export interface StartScanOptions {
  repo: string; // taranacak dizin (mutlak yol)
  roles?: WorkerRole[]; // boş = tüm review rolleri
  skills?: Record<string, string[]>; // rol başına skill alt-kümesi
}

export interface ScanHandle {
  scanId: string;
  roles: WorkerRole[];
}

export async function startScan(opts: StartScanOptions): Promise<ScanHandle> {
  const requested =
    opts.roles && opts.roles.length > 0 ? opts.roles : REVIEW_ROLES;
  const roles = requested.filter((r) => REVIEW_ROLES.includes(r));
  if (roles.length === 0) {
    throw new Error("en az bir geçerli review rolü gerekli");
  }

  const scan = await prisma.scan.create({
    data: { repo: opts.repo, roles: JSON.stringify(roles), status: "running" },
  });
  const scanId = scan.id;

  let pending = roles.length;
  const finalize = async () => {
    pending -= 1;
    if (pending > 0) return;
    await prisma.scan
      .update({
        where: { id: scanId },
        data: { status: "done", finishedAt: new Date() },
      })
      .catch(() => {});
    pubsub.publish(`scan:${scanId}`, {
      type: "_scan_done",
      scanId,
      ts: Date.now(),
    });
  };

  for (const role of roles) {
    try {
      const snap = await orchestrator.spawn({
        name: `scan/${role}`,
        role,
        model: ROLE_PRESETS[role].model,
        cwd: opts.repo,
        autonomous: false,
        allowSharedCwd: true,
        skills: opts.skills?.[role],
      });
      const worker = orchestrator.get(snap.id);
      if (!worker) {
        await finalize();
        continue;
      }

      let handled = false;
      const onMessage = (ev: SDKMessage) => {
        if (handled || ev.type !== "result") return;
        handled = true;
        worker.off("message", onMessage);
        void ingestResult(scanId, role, (ev as { result?: string }).result ?? "")
          .catch((e) => console.error(`[scan] ingest ${role} failed`, e))
          .finally(() => {
            orchestrator.stop(snap.id).catch(() => {});
            void finalize();
          });
      };
      worker.on("message", onMessage);
      worker.once("exit", () => {
        if (handled) return;
        handled = true;
        void finalize();
      });

      worker.assignGoal(SCAN_GOAL);
    } catch (err) {
      console.error(`[scan] ${role} spawn failed`, err);
      await finalize();
    }
  }

  return { scanId, roles };
}

async function ingestResult(scanId: string, role: string, resultText: string) {
  const findings = parseFindings(resultText);
  for (const f of findings) {
    await prisma.finding
      .create({
        data: {
          scanId,
          agent: role,
          severity: f.severity,
          rule: f.rule,
          file: f.file,
          line: f.line ?? null,
          why: f.why,
          fix: f.fix ?? null,
          evidence: f.evidence ?? null,
        },
      })
      .catch(() => {});
  }
  pubsub.publish(`scan:${scanId}`, {
    type: "_scan_progress",
    scanId,
    role,
    findings: findings.length,
    ts: Date.now(),
  });
}

export interface ScanSummary {
  id: string;
  repo: string;
  roles: string[];
  status: string;
  createdAt: string;
  finishedAt: string | null;
  total: number;
  bySeverity: Record<string, number>;
}

export async function listScans(limit = 50): Promise<ScanSummary[]> {
  const rows = await prisma.scan.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { findings: { select: { severity: true } } },
  });
  return rows.map((s) => {
    const bySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of s.findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }
    return {
      id: s.id,
      repo: s.repo,
      roles: safeParseRoles(s.roles),
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      finishedAt: s.finishedAt?.toISOString() ?? null,
      total: s.findings.length,
      bySeverity,
    };
  });
}

export async function getScan(id: string) {
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: {
      findings: {
        orderBy: [{ severity: "asc" }, { agent: "asc" }],
      },
    },
  });
  if (!scan) return null;
  return {
    id: scan.id,
    repo: scan.repo,
    roles: safeParseRoles(scan.roles),
    status: scan.status,
    createdAt: scan.createdAt.toISOString(),
    finishedAt: scan.finishedAt?.toISOString() ?? null,
    findings: scan.findings,
  };
}

function safeParseRoles(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
