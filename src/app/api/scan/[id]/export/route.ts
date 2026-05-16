// GET /api/scan/:id/export?format=json|csv|sarif — orchestrator daemon'a proxy.
// Daemon dosya gövdesini + Content-Disposition header'ını üretir.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
