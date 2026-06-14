// /api/memory/* — orchestrator daemon'a proxy (.agentwiki per-proje hafıza).
import { proxy } from "@/lib/daemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request) => proxy(req);
export const POST = (req: Request) => proxy(req);
