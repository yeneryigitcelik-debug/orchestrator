# orchestrator

Yerel orkestratör + panel: tek bilgisayar üzerinde **birden fazla paralel Claude Code oturumunu** (worker) tek bir kontrol panelinden yönetir. Backend / frontend / watcher gibi roller atanır, her worker aynı veya farklı proje üstünde çalışır, tüm akış canlı izlenir. İleride remote (Telegram bot) ile dışarıdan komut alacak.

## Ana karar: SDK değil, CLI

Claude Agent SDK abonelik token'ı **kullanmıyor** (sadece `ANTHROPIC_API_KEY`). Bu projede maliyet hedefi sıfır API ücreti olduğundan SDK'yı atlıyoruz ve `claude` CLI'yi doğrudan subprocess olarak yönetiyoruz. CLI, makinedeki `claude login` (claude.ai OAuth) ile gelen Max aboneliğini otomatik kullanır.

Anahtar CLI bayrakları:

```
claude -p \
  --output-format stream-json \
  --input-format stream-json \
  --include-partial-messages \
  --session-id <uuid> \
  --model <opus|sonnet|haiku> \
  --permission-mode bypassPermissions \
  --add-dir <project-path>
```

stdin → JSON satırları, stdout → JSON event akışı. Resume için aynı `--session-id` veya `--resume <id>`.

Windows notu: spawn `shell: false` ile yapılır ve `claude.exe`'nin tam yolu çözülür (`spawner.ts:resolveClaudeBin`). `shell: true` cmd.exe'ye düşer ve `--append-system-prompt`'taki newline'ları parse ederken sonraki bayrakları (örn. `--mcp-config`) siler.

## Mimari: Lead modeli

Sistem chat-first çalışır; kullanıcı hem Lead ile konuşur hem panelden doğrudan helper spawn edebilir:

- Boot'ta kalıcı bir **Lead** worker (`role=lead`, opus) spawn edilir (`lead.ts` + `orchestrator.ensureLead`).
- Kullanıcı Lead ile konuşur (transmission bar) ve Mission Control grid'inden manuel helper spawn eder (`SpawnDialog` → `POST /api/workers`).
- Lead'e `--mcp-config` ile yerel bir **MCP server** (`scripts/mcp-server.mjs`) bağlanır; bu ona orkestrasyon araçları verir: `spawn_helper`, `send_helper`, `list_helpers`, `kill_helper`, `wait_helper`.
- Lead görevi parçalar, gerektiğinde helper spawn eder, `wait_helper` ile bekler, sonucu raporlar.
- MCP server stdio'dan çalışır, tool çağrılarını HTTP üzerinden orchestrator'ın REST API'sine düşürür.

Lead her boot'ta fresh spawn olur (resume yok — claude session dosyası sık kaybolduğu için). Helper'lar transient; goal'i bitince subprocess yaşamaya devam eder, Lead `kill_helper` ile veya kullanıcı manuel temizler.

## Stack

- **Runtime**: Node.js 25 (Windows)
- **Dil**: TypeScript
- **Paket yöneticisi**: pnpm
- **App**: Next.js 16 (App Router) — tek proje hem UI hem API hem orchestrator
- **DB**: SQLite + Prisma (workers, messages)
- **UI**: Tailwind v4 — Matrix terminal estetiği (IBM Plex Mono + Orbitron, yeşil fosfor paleti, dijital yağmur + CRT scanline). Ana ekran "Mission Control" agent kart grid'i.
- **MCP**: `@modelcontextprotocol/sdk` — Lead'in orkestrasyon araç sunucusu
- **Streaming**: Server-Sent Events (SSE)
- **Auth**: makinedeki `claude` CLI'nin Max aboneliği (zaten login)

İleride: Telegram webhook + cloudflared tunnel; VPS'e taşıma opsiyonel.

## Klasör yapısı

```
/CLAUDE.md /README.md /README.tr.md /LICENSE
/package.json /tsconfig.json /.env.example
/prisma/
  schema.prisma          → Worker + Message tabloları
/scripts/
  mcp-server.mjs         → Lead'e tool sağlayan MCP server (stdio)
  start.mjs              → production entry (NSSM hedefi)
  *.bat                  → Windows servis kurulum/yönetim
/src/
  instrumentation.ts     → server boot hook (restoreFromDB + ensureLead + shutdown)
  /app/                  → Next.js App Router (UI + API)
    /api/
      /lead/             → GET: Lead snapshot (ensureLead idempotent)
      /workers/          → REST: spawn/kill/list
      /workers/[id]/
        /message/        → worker'a mesaj yolla
        /stream/         → SSE: worker output stream
        /goal/ /autonomous/
    /page.tsx /layout.tsx /globals.css
  /core/                 → orchestrator çekirdeği
    spawner.ts           → claude CLI subprocess başlatıcı (Windows path resolution)
    worker.ts            → Worker class (lifecycle + otonom döngü + MAX_ITERATIONS)
    orchestrator.ts      → WorkerPool (registry + ensureLead + cwd çakışma koruması)
    lead.ts              → Lead bootstrap + master system prompt
    role-prompts.ts      → backend/frontend/db/devops/qa/watcher system prompt'ları
    stream.ts            → stream-json parser
    types.ts             → SDKMessage tip tanımları
  /lib/
    db.ts                → Prisma client singleton
    pubsub.ts            → in-memory pubsub (worker → SSE)
  /components/           → Panel (Mission Control grid), AgentCard, SpawnDialog,
                           MatrixRain (dijital yağmur), LeadChat, WorkerPane,
                           TransmissionBar, MessageView, StatusBadge,
                           ScanLauncher, ScanProgress, FindingsList
```

## Worker rolleri

`role-prompts.ts`'te her rolün odaklı system prompt'u + default model'i var:

- **lead** (opus) — orkestratör; kullanıcı yalnızca bununla konuşur
- **backend** (opus) — API, DB query, business logic, auth
- **frontend** (opus) — UI, component, styling, client state
- **db** (opus) — şema, migration, query performansı
- **devops** (opus) — Docker, CI/CD, deploy, altyapı config
- **qa** (haiku) — test yazma/koşturma, regresyon, bug raporu
- **watcher** (haiku) — salt-okuma gözlem, durum özeti

Ucuz rolleri (qa, watcher) haiku'da çalıştırmak Max plan rate-limit baskısını azaltır.

## Komutlar

```
pnpm prod              → build + production server (orchestrator'ı ÇALIŞTIRMAK için bu)
pnpm dev               → Next.js dev server — SADECE UI/kod düzenlerken
pnpm build             → production build
pnpm start             → mevcut build'i production modda başlat (build etmeden)
pnpm db:push           → SQLite şemasını uygula
pnpm typecheck         → tsc --noEmit
node scripts/db-cleanup.mjs   → orphan/tehlikeli worker kayıtlarını temizle
node scripts/peek-lead.mjs    → Lead'in son mesajlarını DB'den oku (debug)
```

**Dev vs prod — önemli:** `pnpm dev` Turbopack derleyicisini + HMR'yi worker'larla
aynı process'te tutar; bellek şişince dev server kendini restart eder ve `.next`
cache'ini bozar (`Could not parse module` hatası). Orchestrator'ı sürekli çalıştırmak
için `pnpm prod` kullan — dev derleyicisi yok, watchdog yok, stabil. `pnpm dev`
yalnızca aktif UI geliştirme için. Her iki mod da `:3005`.

## Konvansiyonlar

- Server-only kod (`src/core/`, `src/lib/db.ts`) Next.js client component'e import edilmez.
- Worker subprocess'leri Next.js dev server süreci içinde tutulur (singleton via `globalThis`); HMR'de yeniden spawn olmamasına dikkat.
- SQLite dosyası `./data/orchestrator.db` (gitignore'lu).
- `bypassPermissions` ile spawn ediyoruz → her worker'ın `cwd`'sini güvenli tut, root yetkisi verme.

## Deploy / Ortamlar

- **Şu an**: yalnız local PC, `pnpm prod` (production server), localhost. `pnpm dev` sadece UI geliştirme.
- **Daemon**: NSSM ile Windows servisi (`scripts/install-service.bat`) — boot'ta açılır, worker'lar DB'den geri yüklenir. Servis kullanıcının kendi hesabıyla çalışmalı (`LocalSystem` değil), yoksa `~/.claude` token'ı bulunamaz.
- **Sonra**: cloudflared tunnel ile dış erişim, Telegram webhook.
- **VPS**: taşırsak `claude setup-token` (long-lived subscription token) gerekecek.

## Güvenlik notları

- Worker subprocess'leri `--dangerously-skip-permissions` ile değil, `--permission-mode bypassPermissions` ile çalışıyor — aynı şey ama belgelenen yol.
- Localhost dışına açılınca panel'e auth (basic / NextAuth) gelecek.

## Notlar

- Repo: yeneryigitcelik-debug/orchestrator (tek kanonik repo — eski `orchestratorwin` terk edildi)
- Local path: macOS `~/developer/orchestrator`, Windows `C:\Users\PC\displayerall` — repo iki makinede de kullanılır, kod cross-platform
- Kullanıcı: Max abonelik (`claude auth status` doğruladı)
- Tek panel sınırı: yok, rate limit pratik tavan (3-5 paralel sürdürülebilir, watcher'ları haiku yaparak 7-10'a çıkılabilir).
