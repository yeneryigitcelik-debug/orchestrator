// GET /api/stream — tüm worker event'lerinin multiplex SSE'si.
// Mission Control grid'i bunu TEK bağlantıyla dinler; event'ler workerId ile
// etiketli gelir. Geçmiş tekrar gönderilmez — yalnız canlı akış.

import { NextRequest } from "next/server";
import { pubsub } from "@/lib/pubsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
          );
        } catch {
          // controller kapanmış olabilir
        }
      };

      send({ type: "_hello", ts: Date.now() });

      // Tüm worker kanallarını tek akışta birleştir — workerId ile etiketli.
      const unsub = pubsub.subscribeAll((workerId, event) => {
        send({ workerId, event });
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
