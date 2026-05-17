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
- MCP server stdio'dan çalışır, tool çağrılarını HTTP üzerinden **orchestrator daemon**'a düşürür.

Lead her boot'ta fresh spawn olur (resume yok — claude session dosyası sık kaybolduğu için). Helper'lar transient; goal'i bitince subprocess yaşamaya devam eder, Lead `kill_helper` ile veya kullanıcı manuel temizler.

## Mimari: daemon ayrımı (iki process)

Orchestrator çekirdeği Next.js sürecinde DEĞİL, ayrı bir **daemon process**'inde çalışır:

- **orchestrator daemon** (`src/core/daemon-server.ts`, `tsx` ile çalışır): worker subprocess'leri, pubsub ve **tüm Prisma DB erişimi** burada. `127.0.0.1:3006`'da HTTP/SSE API sunar — yollar Next'in eski `/api/*` şekliyle birebir aynı.
- **Next.js** (`:3005`): yalnız UI + filesystem route'ları (skills/roster/fs). Worker/scan/lead/stream/audit istekleri `src/lib/daemon.ts` proxy'siyle daemon'a iletilir.
- `scripts/launch.mjs` ikisini başlatır ve **denetler**: her process çökerse otomatik yeniden başlar (60sn'de 5'ten fazla → crash-loop, vazgeç). Daemon HANG ederse `/health` izleyici onu öldürüp yeniden başlatır. Next çökerse daemon'a dokunulmaz — worker'lar yaşar. Daemon yeniden başlayınca `restoreFromDB` worker'ları DB'den kurtarır.
- MCP server doğrudan daemon'a bağlanır (Next'e değil) — Next çökse de Lead worker'ları yönetmeye devam eder.
- Daemon dayanıklılığı: `uncaughtException`/`unhandledRejection` loglanır ama daemon ayakta kalır; DB SQLite WAL modunda (crash-güvenli).

Neden: `next dev` Turbopack + HMR ile belleği şişirip kendini restart ediyor, worker subprocess'leri o sürece bağlı olduğu için kayboluyordu. Ayrı process + denetim bunu kökten çözer.

## Stack

- **Runtime**: Node.js 25 (Windows)
- **Dil**: TypeScript
- **Paket yöneticisi**: pnpm
- **App**: Next.js 16 (App Router) — UI + API proxy. Orchestrator çekirdeği ayrı daemon process (`tsx` ile çalışan `daemon-server.ts`)
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
  mcp-server.mjs         → Lead'e tool sağlayan MCP server (stdio → daemon HTTP)
  launch.mjs             → daemon + Next'i birlikte başlatan ortak launcher
  start.mjs / dev.mjs    → prod / dev entry (ikisi de launch.mjs'i çağırır)
  *.bat                  → Windows servis kurulum/yönetim
/src/
  /app/                  → Next.js App Router (UI + API proxy)
    /api/
      /lead/ /workers/ /scan/ /stream/ /audit/  → daemon'a proxy (src/lib/daemon.ts)
      /skills/ /roster/ /fs/                     → filesystem — Next'te kalır
    /page.tsx /layout.tsx /globals.css
  /core/                 → orchestrator çekirdeği (daemon process'inde çalışır)
    daemon-server.ts     → daemon HTTP/SSE sunucusu (:3006) + boot (restore+ensureLead)
    spawner.ts           → claude CLI subprocess başlatıcı (Windows path resolution)
    worker.ts            → Worker class (lifecycle + otonom döngü + MAX_ITERATIONS)
    orchestrator.ts      → WorkerPool (registry + ensureLead + cwd çakışma koruması)
    lead.ts              → Lead bootstrap (MCP config + spawn request)
    lead-prompt.ts       → Lead master system prompt (DB'siz — Next de import edebilir)
    role-prompts.ts      → rol bazlı system prompt + default model
    stream.ts            → stream-json parser
    types.ts             → SDKMessage tip tanımları
  /lib/
    db.ts                → Prisma client singleton (yalnız daemon kullanır)
    pubsub.ts            → in-memory pubsub (worker → SSE)
    daemon.ts            → Next → daemon HTTP/SSE proxy helper
  /components/           → Panel (Mission Control grid), AgentCard, SpawnDialog,
                           MatrixRain (dijital yağmur), LeadChat, WorkerPane,
                           TransmissionBar, MessageView, StatusBadge,
                           ScanLauncher, ScanProgress, FindingsList
```

## Worker rolleri

`role-prompts.ts`'te her rolün odaklı system prompt'u + default model'i var:

- **lead** (opus) — orkestratör; kullanıcı yalnızca bununla konuşur
- **backend** (sonnet) — API, DB query, business logic, auth
- **frontend** (sonnet) — UI, component, styling, client state
- **db** (sonnet) — şema, migration, query performansı
- **devops** (sonnet) — Docker, CI/CD, deploy, altyapı config
- **qa** (haiku) — test yazma/koşturma, regresyon, bug raporu
- **watcher** (haiku) — salt-okuma gözlem, durum özeti

Model katmanlı: standart üretim işi **sonnet** (varsayılan), salt-okuma/mekanik
işler **haiku**, yalnız `debug` ve `security` rolleri **opus**. Lead `spawn_helper`'da
görev zorluğuna göre model'i bilinçli seçer; model geçmezse `orchestrator.spawn`
rolün preset default'unu enjekte eder — opus'a körlemesine düşmez. Bu katmanlama
Max plan rate-limit baskısını ve gereksiz opus kullanımını azaltır.

## Komutlar

```
pnpm dev               → daemon + Next.js dev server (UI için HMR'li)
pnpm prod              → build + daemon + Next.js production server
pnpm build             → production build
pnpm start             → daemon + mevcut build'i production modda başlat
pnpm daemon            → yalnız orchestrator daemon (debug)
pnpm db:push           → SQLite şemasını uygula
pnpm typecheck         → tsc --noEmit
node scripts/db-cleanup.mjs   → orphan/tehlikeli worker kayıtlarını temizle
node scripts/peek-lead.mjs    → Lead'in son mesajlarını DB'den oku (debug)
```

`dev` ve `prod`/`start` ikisi de **daemon + Next**'i birlikte ayağa kaldırır
(`scripts/launch.mjs`). Panel `:3005`, daemon `:3006` (`DAEMON_PORT`). Daemon
ayrı process olduğu için `next dev`'in Turbopack/HMR bellek baskısı artık
worker'ları etkilemez — `pnpm dev` günlük geliştirme için güvenli. Daemon kodu
(`src/core/*`) değişirse daemon'ı elle yeniden başlat (tsx hot-reload yapmaz).

## Konvansiyonlar

- `src/core/*` ve `src/lib/db.ts` (+ `pubsub.ts`) **yalnız daemon process'inde** çalışır — Next route'larına/component'lerine import EDİLMEZ. Next worker/scan/lead işlerini `src/lib/daemon.ts` proxy'siyle yapar. (`src/core/skills.ts`, `role-prompts.ts`, `lead-prompt.ts`, `types.ts` DB'siz olduğu için Next de import edebilir.)
- Worker subprocess'leri orchestrator daemon process'inde tutulur — ayrı process olduğu için Next çökse/yeniden başlasa da yaşamaya devam eder.
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
