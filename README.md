# orchestrator

> A local orchestrator for running multiple parallel Claude Code agents on a single machine — driven by your Claude subscription, not an API key.

[Türkçe README → `README.tr.md`](./README.tr.md)

orchestrator runs a persistent **Lead** agent that you chat with. The Lead plans
your task, spawns specialized **helper** agents, coordinates them, and reports
back — and you can also spawn helpers yourself, directly from the Mission
Control panel. Everything runs locally as `claude` CLI subprocesses that share
your machine's existing Claude login — so there is **no per-token API cost**,
only your subscription's rate limits.

> **Status: early / experimental.** It works end-to-end but is rough around the
> edges. Developed on macOS; the process spawner also supports Windows.

---

## Why

The Claude Agent SDK only authenticates with `ANTHROPIC_API_KEY` (pay-per-use).
If your goal is zero API spend, you instead drive the `claude` CLI directly as a
subprocess — it transparently uses the Max/Pro subscription from `claude login`.
orchestrator is the control plane on top of that idea: spawn, monitor, and
coordinate many of those subprocesses from one panel.

## How it works

```
                  you  ──chat──►  ┌──────────────┐
                                  │  LEAD agent  │  (persistent — main directive channel)
                                  └──────┬───────┘
                                         │ MCP tools:
                                         │  spawn_helper / send_helper
                                         │  list_helpers / kill_helper / wait_helper
                                         ▼
                                  ┌──────────────┐
              you ──spawn──►      │ orchestrator │  (Next.js process)
                                  │  + SQLite    │
                                  └──────┬───────┘
                                         ▼
              ┌────────── helper agents (transient, isolated) ──────────┐
              │  backend   frontend   db   devops   qa   watcher        │
              │  each: a `claude -p --output-format stream-json` proc   │
              └──────────────────────────────────────────────────────────┘
                                         │
                                  live SSE stream
                                         ▼
                            Mission Control grid panel
```

- You direct the **Lead** through the panel — and can also spawn, inspect, and
  message helper agents yourself from the Mission Control grid.
- The Lead has a local **MCP server** giving it orchestration tools
  (`spawn_helper`, `send_helper`, `list_helpers`, `kill_helper`, `wait_helper`).
- Each worker is an isolated `claude` CLI subprocess with its own session id.
- Worker output streams live to the panel over Server-Sent Events.
- Worker state is persisted in SQLite and auto-restored after a restart.
- Helpers run autonomously: given a goal, they loop until they emit `[DONE]`
  (with a hard `MAX_ITERATIONS` cap so a runaway loop can't drain your quota).

## Requirements

- **Node.js 22+** (developed on 25)
- **pnpm**
- **Claude CLI**, logged in — verify with `claude auth status`
  (you should see a `subscriptionType`, not an API key)
- **macOS or Windows** — developed on macOS; the spawner also has
  Windows-specific path resolution for `claude.exe`.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:push        # create SQLite tables
pnpm dev            # http://localhost:3005
```

Open `http://localhost:3005`. The Lead spawns automatically on first boot.
Type a product/feature-level directive into the transmission bar — for example:

> "Scaffold a Next.js portfolio site and deploy it to Vercel."

The Lead will plan, spawn helpers where parallelism helps, and report back. You
can also press **⊕ SPAWN** to launch a helper yourself.

## Worker roles

Each role ships with a focused system prompt (`src/core/role-prompts.ts`):

| Role       | Default model | Scope |
|------------|---------------|-------|
| `lead`     | opus          | Orchestrator — you talk to this one |
| `backend`  | opus          | APIs, business logic, DB queries, auth |
| `frontend` | opus          | UI, components, styling, client state |
| `db`       | opus          | Schema, migrations, query performance |
| `devops`   | opus          | Docker, CI/CD, deploy, infra config |
| `qa`       | haiku         | Tests, regression hunting, bug reports |
| `watcher`  | haiku         | Read-only observation & status summaries |

Plus specialist roles — `security`, `performance`, `database`, `api`,
`infrastructure`, `quality`, `ui`, `ux`, `cost` — which carry their own skill
sets and power the `/scan` repo-review mode. All roles are spawnable from the
panel's **⊕ SPAWN** dialog.

Running cheap roles (`qa`, `watcher`) on Haiku reduces pressure on your
subscription's rate limit.

## Daemon (24/7)

To keep the orchestrator alive across reboots, install it as a Windows service
via [NSSM](https://nssm.cc/download):

```bash
pnpm build
scripts\install-service.bat   # run from an Administrator prompt
```

Workers are auto-restored from SQLite when the service restarts.

> **Note:** the service must run under **your** user account (not `LocalSystem`),
> otherwise the spawned `claude` processes cannot find your `~/.claude` login.

## Tech stack

- **Next.js 16** (App Router) — UI, API, and orchestrator in one process
- **TypeScript**
- **SQLite + Prisma** — worker & message persistence
- **@modelcontextprotocol/sdk** — the Lead's orchestration tool server
- **Server-Sent Events** — live worker output streaming
- **Tailwind CSS v4** — Matrix-themed Mission Control panel

## Project layout

```
src/
  app/            Next.js App Router (panel UI + REST API + SSE)
  components/     Panel (Mission Control grid), AgentCard, SpawnDialog,
                  MatrixRain, LeadChat, WorkerPane, TransmissionBar, ...
  core/
    spawner.ts        claude CLI subprocess launcher
    worker.ts         Worker lifecycle + autonomous loop
    orchestrator.ts   WorkerPool registry/manager (singleton)
    lead.ts           Lead bootstrap + master system prompt
    role-prompts.ts   Per-role system prompts
    stream.ts         stream-json (NDJSON) parser
  lib/            Prisma client, in-memory pubsub, role metadata
scripts/
  mcp-server.mjs      MCP server exposing orchestration tools to the Lead
  start.mjs           production entry point (NSSM target)
  *.bat               Windows service install/manage
prisma/
  schema.prisma       Worker + Message tables
```

## Security notes

- Workers run with `--permission-mode bypassPermissions` — they execute tools
  (Bash, Edit, Write, …) without confirmation. Keep each worker's working
  directory scoped and trusted.
- All workers share the single `~/.claude` credential on disk. There is no new
  login per worker; they all read the same token.
- The panel has **no authentication** — bind it to `localhost` only. Do not
  expose port 3005 to a network without adding auth first.

## License

MIT — see [`LICENSE`](./LICENSE).
