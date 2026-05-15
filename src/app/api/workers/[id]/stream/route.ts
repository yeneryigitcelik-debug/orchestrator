// GET /api/workers/:id/stream — Server-Sent Events stream'i.
// Önce mevcut geçmiş (history) basılır, ardından canlı event'ler.

import { NextRequest } from "next/server";
import { orchestrator } from "@/core/orchestrator";
import { pubsub } from "@/lib/pubsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const worker = orchestrator.get(id);
  if (!worker) {
    return new Response("Worker bulunamadı", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller kapanmış olabilir
        }
      };

      // İlk olarak hello mesajı
      send({ type: "_hello", workerId: id, ts: Date.now() });

      // Geçmişi gönder
      for (const ev of worker.history()) {
        send(ev);
      }

      // Canlı abonelik
      const unsub = pubsub.subscribe(id, send);

      // Heartbeat (proxy timeout'larını uzak tut)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Cleanup
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
