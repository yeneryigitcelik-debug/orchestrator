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
- Panelin **Şablon Vitrini** (`/vitrin`, `TemplateWizard`) görünümünde arketip + stil preset seçilir; seçimler yapılı bir brief'e (`[VİTRİN BRIEF]`) çevrilip Lead'e gönderilir ve Lead build'e başlar.
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

## Mimari: Proje hafızası (.agentwiki)

Her proje kendi kalıcı agent hafızasını `<proje>/.agentwiki/` altında markdown wiki olarak taşır (Karpathy "LLM Wiki" deseni; agentmemory'den 4-tier + decay + provenance konseptleri, native — iii-engine/Docker YOK). Kaynak doğruluk = markdown; embedding/index `.cache/`'te türetilmiş + gitignore'lu. Bölümleme klasöre göre: normalized cwd = partition anahtarı.

- **Tier'lar**: working (uçucu) · episodic (oturum notu) · semantic (kalıcı fact/karar) · procedural (tekrarlı how-to). Ayrıca `INDEX.md` (giriş), `log.md` (append-only), `_schema.md` (konvansiyon).
- **Yazım serileştirme**: daemon tek-process → per-proje in-process mutex (`memory-store.ts` `withLock`) tüm yazmaları serialize eder; atomik `.tmp`→`rename`. Dosya kilidi gerekmez.
- **Konsolidasyon (SIFIR API)**: (A) deterministik — helper `[DONE]`/`[BLOCKED]` ile bitince `orchestrator` `captureEpisode` ile working→episodic yazar (LLM yok; dosyalar worker history'sinden). (B) agent-güdümlü — Lead checkpoint/idle turn'lerinde (subscription) episodic→semantic/procedural terfi eder. **Helper'lara da memory-only MCP bağlıdır (read+write)** — kendi projelerine doğrudan `memory_search`/`memory_write` yapar (`project` boş = cwd); Lead full MCP'yi taşır. Deterministik yakalama + Lead curate sürer.
- **Arama**: `searchMemory` hibrit — BM25 keyword + yerel vektör (`@huggingface/transformers`, all-MiniLM-L6-v2, 384-dim, offline) RRF(k=60) ile füzyon. Model kapalı/yoksa keyword-only (graceful). `MEMORY_EMBEDDINGS=0` kapatır.
- **Lint/decay**: `lintMemory` orphan/bayat/kırık-link/çelişki-adayı bulur + eski `working/` budar; aramada erişilen sayfaların `hits`/`accessedAt`'i artar (access-boost).
- **Enjeksiyon**: spawn'da `buildMemoryPrompt(cwd, role)` — helper'a projenin INDEX'i, Lead'e proje roster'ı (mevcut `buildSkillPrompt` deseni). Autonomous tick prompt'una hafıza adımları eklendi.
- **Erişim**: `memory_index/search/read/write/lint` — Lead full MCP (`scripts/mcp-server.mjs`) + helper'lar memory-only MCP (`scripts/mcp-memory.mjs`, paylaşılan tool modülü `mcp-memory-tools.mjs`). Panel `/memory` (canlı SSE, sayfa düzenleme + bağlantı görünümü). Gece otomatik `memory-lint` cron (scheduler `seedDefaults`, `/schedule`'dan kapatılabilir).
- **Tasarım kalitesi (Hallmark)**: `skills/_shared/hallmark.md` anti-slop disiplini UI rollerine (design/frontend/mobile/ios/android) otomatik enjekte edilir (`skills.ts` `_shared` mekanizması); tam ruleset `reference/hallmark/`'ta (`--add-dir` ile on-demand okunur); `skills/ui|ux/hallmark-slop.md` scan audit gate'leri. Kaynak: Nutlope/hallmark (MIT, vendored snapshot).

İlgili dosyalar: `src/core/memory-store.ts` (FS + arama + lint), `src/core/embeddings.ts` (yerel model), `src/core/memory-prompt.ts` (enjeksiyon + roster), `src/lib/paths.ts` (`normalizeCwd`), daemon `/api/memory/*`, `src/components/MemoryPanel.tsx`.

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
/blueprints/             → SaaS arketip şablonları (Lead --add-dir ile okur)
  README.md _template.md → 12 arketip (dashboard-saas, ai-saas, marketplace,
                           ecommerce-store, productivity-tool, knowledge-base,
                           social-app, communication-tool, file-storage,
                           media-library, cms-blog, developer-tool)
  catalog.md             → awesome-selfhosted kategori + standart özellik referansı
/skills/                 → rol bazlı skill kütüphanesi (skills/<role>/*.md)
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
    /vitrin/             → Şablon Vitrini sayfası (arketip+stil sihirbazı)
    /roster/ /scan/ /audit/ /usage/              → panel görünüm route'ları
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
    templates.ts         → Vitrin verisi: 12 arketip + 8 stil preset + composeBrief
  /components/           → Panel (Mission Control grid), AgentCard, SpawnDialog,
                           MatrixRain (dijital yağmur), LeadChat, WorkerPane,
                           TransmissionBar, MessageView, StatusBadge, Roster,
                           TemplateWizard (Şablon Vitrini sihirbazı),
                           ScanLauncher, ScanProgress, FindingsList
```

## Worker rolleri

`role-prompts.ts`'te her rolün odaklı system prompt'u + default model'i var:

- **lead** (opus) — orkestratör; kullanıcı yalnızca bununla konuşur. Opus = en üst katman
- **backend** (sonnet) — API, DB query, business logic, auth
- **frontend** (sonnet) — UI, component, styling, client state
- **design** (sonnet) — tasarım sistemi: token foundation, çok-platform tema, component kütüphanesi
- **mobile** (sonnet) — cross-platform mobil uygulama (React Native + Expo)
- **ios** (sonnet) — native iOS (Swift / SwiftUI)
- **android** (sonnet) — native Android (Kotlin / Jetpack Compose)
- **db** (sonnet) — şema, migration, query performansı
- **devops** (sonnet) — Docker, CI/CD, deploy, altyapı config
- **qa** (haiku) — test yazma/koşturma, regresyon, bug raporu
- **watcher** (haiku) — salt-okuma gözlem, durum özeti

Model üç katmanlı (ucuzdan pahalıya): salt-okuma/mekanik işler **haiku**,
standart üretim işi **sonnet** (varsayılan), gerçekten zor / en yüksek bahis
işler (`debug`, `security`, karmaşık mimari) **opus** (en üst katman). Lead'in
kendisi `opus`'ta koşar. Lead `spawn_helper`'da görev zorluğuna göre model'i
bilinçli seçer ve zor bir alt-görevde helper'a da `opus` verebilir — karar
Lead'e bırakılmıştır. Model geçmezse `orchestrator.spawn` rolün preset
default'unu enjekte eder — üst katmana körlemesine düşmez. Bu katmanlama Max
plan rate-limit baskısını ve gereksiz pahalı-katman kullanımını azaltır.

**Tasarım sistemi öncelikli inşa**: UI'lı bir ürün/SaaS kurarken Lead önce `design`
helper'ı spawn eder (token foundation + component kütüphanesi + `DESIGN-SYSTEM.md`),
sonra platform helper'ları (`frontend`/`mobile`/`ios`/`android`) bu çıktıyı tüketir.
Lead göreve uygun SaaS arketipini `blueprints/` klasöründen okuyarak planlar; detay
`skills/lead/saas-build.md`'de. Panelin **Şablon Vitrini** (`/vitrin`) arketip + stil
seçimini görsel bir sihirbaza bağlar — seçim otomatik `[VİTRİN BRIEF]` üretir.

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
