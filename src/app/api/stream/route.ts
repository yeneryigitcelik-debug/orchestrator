// GET /api/stream — tüm worker event'lerinin multiplex SSE'si.
// orchestrator daemon'a SSE proxy.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
