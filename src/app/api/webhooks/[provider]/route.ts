// POST /api/webhooks/[provider] — git push'ta otomatik tarama
// provider: github | gitlab | generic
//
// İmza doğrulama secret'ları env'den:
//   GITHUB_WEBHOOK_SECRET, GITLAB_WEBHOOK_SECRET, GENERIC_WEBHOOK_SECRET
// İlgili secret yoksa o endpoint 503 döner (devre dışı).
//
// Taranacak repo: webhook payload'ından çıkarılan repo adı, WEBHOOK_REPO_ROOT
// env'i ile birleştirilir → WEBHOOK_REPO_ROOT/<name>. Generic webhook body'de
// doğrudan { repo: "<mutlak yol>" } da verebilir.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { startScan } from "@/core/scan";
import { audit } from "@/core/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tsEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function resolveRepo(name: string): string | null {
  // mutlak yol doğrudan kabul
  if (path.isAbsolute(name)) return name;
  const root = process.env.WEBHOOK_REPO_ROOT;
  if (!root) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null; // path traversal koruması
  return path.join(root, name);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const raw = await req.text();

  let repo: string | undefined;

  if (provider === "github") {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "github webhook kapalı" }, { status: 503 });
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!tsEqual(sig, expected)) {
      return NextResponse.json({ error: "imza geçersiz" }, { status: 401 });
    }
    const body = safeJson(raw);
    const name = (body?.repository as { name?: unknown } | undefined)?.name;
    if (name) repo = resolveRepo(String(name)) ?? undefined;
  } else if (provider === "gitlab") {
    const secret = process.env.GITLAB_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "gitlab webhook kapalı" }, { status: 503 });
    const token = req.headers.get("x-gitlab-token") ?? "";
    if (!tsEqual(token, secret)) {
      return NextResponse.json({ error: "token geçersiz" }, { status: 401 });
    }
    const body = safeJson(raw);
    const projectPath = (body?.project as { path?: unknown } | undefined)?.path;
    if (projectPath) repo = resolveRepo(String(projectPath)) ?? undefined;
  } else if (provider === "generic") {
    const secret = process.env.GENERIC_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "generic webhook kapalı" }, { status: 503 });
    const sig = req.headers.get("x-signature-256") ?? "";
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!tsEqual(sig, expected)) {
      return NextResponse.json({ error: "imza geçersiz" }, { status: 401 });
    }
    const body = safeJson(raw);
    if (body?.repo) repo = resolveRepo(String(body.repo as unknown)) ?? undefined;
  } else {
    return NextResponse.json({ error: "bilinmeyen provider" }, { status: 404 });
  }

  if (!repo) {
    return NextResponse.json(
      { error: "repo çözülemedi — WEBHOOK_REPO_ROOT ayarlı mı?" },
      { status: 400 },
    );
  }

  try {
    const handle = await startScan({ repo });
    await audit("webhook.scan", handle.scanId, { provider, repo }, `webhook:${provider}`);
    return NextResponse.json({ ok: true, scan: handle }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scan başlatılamadı" },
      { status: 500 },
    );
  }
}

function safeJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
