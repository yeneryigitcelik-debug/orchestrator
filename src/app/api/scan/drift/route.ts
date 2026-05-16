// GET /api/scan/drift?repo=&days= — repo severity trendi. daemon'a proxy.

import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req);
}
