import { orchestrator } from "@/core/orchestrator";
import { Panel } from "@/components/Panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Lead garantili — yoksa burada spawn edilir (idempotent)
  const lead = await orchestrator.ensureLead();
  // Helper'lar = Lead dışında her şey
  const helpers = orchestrator.list().filter((w) => w.role !== "lead");
  return <Panel lead={lead} initialHelpers={helpers} />;
}
