// POST /api/workers/:id/autonomous — orchestrator daemon'a proxy.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return proxy(req);
}
