// GET/POST /api/workers — orchestrator daemon'a proxy (worker listele / spawn).

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
export function POST(req: Request) {
  return proxy(req);
}
