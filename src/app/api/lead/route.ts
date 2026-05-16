// GET /api/lead — Lead worker snapshot'ı. orchestrator daemon'a proxy.
// Daemon tarafında ensureLead idempotent — Lead yoksa spawn eder.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
