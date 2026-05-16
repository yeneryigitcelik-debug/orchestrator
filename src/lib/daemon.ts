// Next.js → orchestrator daemon proxy.
//
// Worker / scan / lead / stream / audit API'leri artık ayrı bir process'te
// (orchestrator daemon, src/core/daemon-server.ts) yaşar. Bu helper gelen
// isteği olduğu gibi daemon'a iletir, yanıtı (JSON ya da SSE stream) aynen
// geri döndürür. Böylece Next çökse de worker'lar daemon'da hayatta kalır.

export const DAEMON_URL = process.env.DAEMON_URL ?? "http://127.0.0.1:3006";

/** İstek yolunu + body'sini daemon'a aynen ilet, yanıtı stream olarak döndür. */
export async function proxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = DAEMON_URL + url.pathname + url.search;

  const headers: Record<string, string> = {
    accept: req.headers.get("accept") ?? "*/*",
  };
  const init: RequestInit = { method: req.method, headers, signal: req.signal };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    headers["content-type"] =
      req.headers.get("content-type") ?? "application/json";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return Response.json(
      {
        error: `orchestrator daemon'a ulaşılamadı (${DAEMON_URL}). Daemon çalışıyor mu? (pnpm prod / pnpm dev)`,
      },
      { status: 502 },
    );
  }

  // Yanıt header'larından yalnız anlamlı olanları taşı; gövde stream olarak akar
  // (SSE için kritik — text/event-stream upstream'den gelir).
  const out = new Headers();
  for (const h of [
    "content-type",
    "cache-control",
    "content-disposition",
    "x-accel-buffering",
  ]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
