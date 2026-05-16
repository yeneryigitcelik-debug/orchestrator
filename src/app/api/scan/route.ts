// GET/POST /api/scan — scan listele / başlat. orchestrator daemon'a proxy.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
export function POST(req: Request) {
  return proxy(req);
}
