// Mission Control ana sayfası — server component.
// Worker/Lead state'i artık orchestrator daemon'da; buradan HTTP ile çekilir.

import { Panel } from "@/components/Panel";
import { DAEMON_URL } from "@/lib/daemon";
import type { WorkerSnapshot } from "@/components/WorkerPane";
import type { LeadSnapshot } from "@/components/LeadChat";

export const dynamic = "force-dynamic";

async function daemonJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${DAEMON_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`orchestrator daemon ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export default async function Home() {
  // Lead garantili — daemon tarafında ensureLead idempotent, yoksa spawn eder.
  const { lead } = await daemonJSON<{ lead: LeadSnapshot }>("/api/lead");
  // Helper'lar = Lead dışında her şey
  const { workers } = await daemonJSON<{ workers: WorkerSnapshot[] }>(
    "/api/workers",
  );
  const helpers = workers.filter((w) => w.role !== "lead");
  return <Panel lead={lead} initialHelpers={helpers} />;
}
