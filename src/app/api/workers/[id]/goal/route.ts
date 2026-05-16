// POST/DELETE /api/workers/:id/goal — orchestrator daemon'a proxy.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return proxy(req);
}
export function DELETE(req: Request) {
  return proxy(req);
}
