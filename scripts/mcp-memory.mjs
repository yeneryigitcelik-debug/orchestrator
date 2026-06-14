#!/usr/bin/env node
/**
 * Helper'lar için memory-only MCP server.
 *
 * Lead'in tam MCP'sinin (mcp-server.mjs) aksine yalnız memory_* araçlarını sunar —
 * helper'lar orkestrasyon (spawn_helper vb.) yapmaz, ama kendi projelerinin
 * hafızasını OKUR/ARAR/YAZAR. `project` boş bırakılırsa bu server'ın cwd'sine
 * (= helper'ın proje dizini) düşer.
 *
 * Tool çağrıları HTTP üzerinden orchestrator daemon'a düşer (Next'e değil).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMemoryTools } from "./mcp-memory-tools.mjs";

const API_BASE = process.env.ORCHESTRATOR_API_URL ?? "http://127.0.0.1:3006";

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${path}: ${body.error ?? text.slice(0, 200)}`,
    );
  }
  return body;
}

function ok(payload) {
  return {
    content: [
      {
        type: "text",
        text:
          typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function fail(msg) {
  return { isError: true, content: [{ type: "text", text: `HATA: ${msg}` }] };
}

const server = new McpServer({ name: "orchestrator-memory", version: "0.1.0" });
registerMemoryTools(server, api, ok, fail);

const transport = new StdioServerTransport();
await server.connect(transport);
