# orchestrator

> Tek bilgisayarda birden fazla paralel Claude Code ajanını yöneten yerel
> orkestratör — API anahtarı ile değil, Claude aboneliğinle çalışır.

[English README → `README.md`](./README.md)

orchestrator, seninle konuşan kalıcı bir **Lead** ajanı çalıştırır. Lead
görevini planlar, uzmanlaşmış **helper** ajanları spawn eder, hepsini koordine
eder ve sana raporlar — dilersen helper'ları Mission Control panelinden kendin
de spawn edebilirsin. Her şey yerelde, makinendeki mevcut Claude oturumunu
paylaşan `claude` CLI subprocess'leri olarak çalışır — yani **token başına API
ücreti yok**, yalnızca aboneliğinin rate limit'i geçerli.

> **Durum: erken / deneysel.** Uçtan uca çalışıyor ama henüz pürüzlü.
> macOS üzerinde geliştirildi; subprocess spawner'ı Windows'u da destekler.

---

## Neden

Claude Agent SDK yalnızca `ANTHROPIC_API_KEY` ile kimlik doğrular
(kullandıkça-öde). Hedefin sıfır API harcamasıysa, bunun yerine `claude` CLI'yi
doğrudan subprocess olarak sürersin — CLI, `claude login` ile gelen Max/Pro
aboneliğini şeffaf şekilde kullanır. orchestrator bu fikrin üstündeki kontrol
katmanıdır: tek panelden bu subprocess'lerin birçoğunu spawn et, izle, koordine
et.

## Nasıl çalışır

```
                  sen ──chat──►  ┌──────────────┐
                                 │  LEAD ajanı  │  (kalıcı — ana direktif kanalı)
                                 └──────┬───────┘
                                        │ MCP araçları:
                                        │  spawn_helper / send_helper
                                        │  list_helpers / kill_helper / wait_helper
                                        ▼
                                 ┌──────────────┐
              sen ──spawn──►     │ orchestrator │  (Next.js process)
                                 │  + SQLite    │
                                 └──────┬───────┘
                                        ▼
              ┌──────── helper ajanları (geçici, izole) ────────┐
              │  backend  frontend  db  devops  qa  watcher     │
              │  her biri: `claude -p --output-format stream-json` │
              └──────────────────────────────────────────────────┘
                                        │
                                  canlı SSE akışı
                                        ▼
                          Mission Control grid paneli
```

- **Lead**'i panelden yönlendirirsin — ayrıca Mission Control grid'inden
  helper ajanları kendin spawn edebilir, inceleyebilir ve onlara mesaj
  yollayabilirsin.
- Lead'in yerel bir **MCP server**'ı vardır; ona orkestrasyon araçları sağlar
  (`spawn_helper`, `send_helper`, `list_helpers`, `kill_helper`, `wait_helper`).
- Her worker, kendi session id'sine sahip izole bir `claude` CLI subprocess'idir.
- Worker çıktısı panele Server-Sent Events ile canlı akar.
- Worker state'i SQLite'ta tutulur, yeniden başlatmadan sonra otomatik geri yüklenir.
- Helper'lar otonom çalışır: bir goal verildiğinde `[DONE]` yazana kadar döner
  (kaçak bir döngünün kotanı tüketmemesi için sabit `MAX_ITERATIONS` tavanı var).

## Gereksinimler

- **Node.js 22+** (25 üzerinde geliştirildi)
- **pnpm**
- **Claude CLI**, giriş yapılmış — `claude auth status` ile doğrula
  (API anahtarı değil, bir `subscriptionType` görmelisin)
- **macOS veya Windows** — macOS üzerinde geliştirildi; spawner'da `claude.exe`
  için Windows'a özgü path çözümleme de var.

## Hızlı başlangıç

```bash
pnpm install
cp .env.example .env
pnpm db:push        # SQLite tablolarını kur
pnpm dev            # http://localhost:3005
```

`http://localhost:3005` aç. Lead ilk açılışta otomatik spawn olur. Transmission
alanına ürün/feature seviyesinde bir direktif yaz — örneğin:

> "Next.js portfolyo sitesi kur ve Vercel'e deploy et."

Lead planlar, paralelleşmenin yardımı olduğu yerde helper spawn eder ve raporlar.
**⊕ SPAWN** ile bir helper'ı kendin de başlatabilirsin.

## Worker rolleri

Her rol odaklı bir system prompt ile gelir (`src/core/role-prompts.ts`):

| Rol        | Varsayılan model | Kapsam |
|------------|------------------|--------|
| `lead`     | opus             | Orkestratör — konuştuğun ajan |
| `backend`  | sonnet           | API, business logic, DB query, auth |
| `frontend` | sonnet           | UI, component, styling, client state |
| `db`       | sonnet           | Şema, migration, query performansı |
| `devops`   | sonnet           | Docker, CI/CD, deploy, altyapı config |
| `qa`       | haiku            | Test, regresyon avı, bug raporları |
| `watcher`  | haiku            | Salt-okuma gözlem & durum özeti |

Modeller ucuzdan pahalıya katmanlı: **haiku** (mekanik/salt-okuma) → **sonnet**
(varsayılan üretim işi) → **opus** (en üst katman — `debug`/`security`, karmaşık
mimari, gerçekten zor / en yüksek bahis işler). Lead Opus'ta koşar ve zor bir
alt-görevde helper'ı kendi takdiriyle `opus` ile spawn edebilir.

Ayrıca uzman roller — `security`, `performance`, `database`, `api`,
`infrastructure`, `quality`, `ui`, `ux`, `cost` — kendi skill setleriyle gelir
ve `/scan` repo-inceleme modunu besler. Tüm roller panelin **⊕ SPAWN**
dialog'undan spawn edilebilir.

Her rolün skill'leri `skills/<role>/*.md` altında durur ve worker spawn olunca
system prompt'una eklenir. Tüm kataloğu — model, base prompt, rol başına
skill'ler — panelin **▦ ROSTER** görünümünden gez ve düzenle.

Ucuz rolleri (`qa`, `watcher`) Haiku'da çalıştırmak aboneliğinin rate limit
baskısını azaltır.

## Daemon (7/24)

Orkestratörü yeniden başlatmalar arasında ayakta tutmak için
[NSSM](https://nssm.cc/download) ile Windows servisi olarak kur:

```bash
pnpm build
scripts\install-service.bat   # Yönetici komut isteminden çalıştır
```

Servis yeniden başladığında worker'lar SQLite'tan otomatik geri yüklenir.

> **Not:** servis **senin** kullanıcı hesabınla çalışmalı (`LocalSystem` değil),
> aksi halde spawn edilen `claude` process'leri `~/.claude` oturumunu bulamaz.

## Teknoloji

- **Next.js 16** (App Router) — UI, API ve orkestratör tek process
- **TypeScript**
- **SQLite + Prisma** — worker & mesaj kalıcılığı
- **@modelcontextprotocol/sdk** — Lead'in orkestrasyon araç sunucusu
- **Server-Sent Events** — canlı worker çıktı akışı
- **Tailwind CSS v4** — Matrix temalı Mission Control paneli

## Klasör yapısı

```
src/
  app/            Next.js App Router (panel UI + REST API + SSE)
  components/     Panel (Mission Control grid), AgentCard, SpawnDialog,
                  MatrixRain, LeadChat, WorkerPane, TransmissionBar, ...
  core/
    spawner.ts        claude CLI subprocess başlatıcı
    worker.ts         Worker lifecycle + otonom döngü
    orchestrator.ts   WorkerPool kayıt/yönetici (singleton)
    lead.ts           Lead bootstrap + master system prompt
    role-prompts.ts   Rol bazlı system prompt'lar
    stream.ts         stream-json (NDJSON) parser
  lib/            Prisma client, in-memory pubsub, rol metadata
skills/
  <role>/*.md         rol bazlı skill kütüphanesi (▦ ROSTER görünümünden yönetilir)
scripts/
  mcp-server.mjs      Lead'e orkestrasyon araçları sağlayan MCP server
  start.mjs           production giriş noktası (NSSM hedefi)
  *.bat               Windows servis kurulum/yönetim
prisma/
  schema.prisma       Worker, Message, Scan, Finding, AuditEvent tabloları
```

## Güvenlik notları

- Worker'lar `--permission-mode bypassPermissions` ile çalışır — araçları
  (Bash, Edit, Write, …) onaysız çalıştırırlar. Her worker'ın çalışma dizinini
  dar ve güvenilir tut.
- Tüm worker'lar disk üzerindeki tek `~/.claude` kimlik bilgisini paylaşır.
  Worker başına yeni login yoktur; hepsi aynı token'ı okur.
- Panelde **kimlik doğrulama yok** — yalnızca `localhost`'a bağla. Önce auth
  eklemeden port 3005'i ağa açma.

## Lisans

MIT — bkz. [`LICENSE`](./LICENSE).
