// GET /api/workers/:id/stream — orchestrator daemon'a SSE proxy.
// Daemon history replay + canlı event akışını üretir; burada aynen akıtılır.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
