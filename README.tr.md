# displayerall

> Tek bilgisayarda birden fazla paralel Claude Code ajanını yöneten yerel
> orkestratör — API anahtarı ile değil, Claude aboneliğinle çalışır.

[English README → `README.md`](./README.md)

displayerall, seninle konuşan kalıcı bir **Lead** ajanı çalıştırır. Lead
görevini planlar, uzmanlaşmış **helper** ajanları (backend, frontend, db,
devops, qa, watcher) spawn eder, hepsini koordine eder ve sana raporlar. Her
şey yerelde, makinendeki mevcut Claude oturumunu paylaşan `claude` CLI
subprocess'leri olarak çalışır — yani **token başına API ücreti yok**, yalnızca
aboneliğinin rate limit'i geçerli.

> **Durum: erken / deneysel.** Uçtan uca çalışıyor ama henüz pürüzlü.
> Windows 11 üzerinde geliştirildi ve test edildi.

---

## Neden

Claude Agent SDK yalnızca `ANTHROPIC_API_KEY` ile kimlik doğrular
(kullandıkça-öde). Hedefin sıfır API harcamasıysa, bunun yerine `claude` CLI'yi
doğrudan subprocess olarak sürersin — CLI, `claude login` ile gelen Max/Pro
aboneliğini şeffaf şekilde kullanır. displayerall bu fikrin üstündeki kontrol
katmanıdır: tek panelden bu subprocess'lerin birçoğunu spawn et, izle, koordine
et.

## Nasıl çalışır

```
                  sen ──chat──►  ┌──────────────┐
                                 │  LEAD ajanı  │  (kalıcı, sadece bununla konuşursun)
                                 └──────┬───────┘
                                        │ MCP araçları:
                                        │  spawn_helper / send_helper
                                        │  list_helpers / kill_helper / wait_helper
                                        ▼
                                 ┌──────────────┐
                                 │ orchestrator │  (Next.js process)
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
                                  chat-first panel
```

- Yalnızca Lead ile, chat-first bir web panelinden konuşursun.
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
- **Windows** — subprocess spawner'ında Windows'a özgü path çözümleme var;
  macOS/Linux'ta çalışabilir ama şu an test edilmedi.

## Hızlı başlangıç

```bash
pnpm install
cp .env.example .env
pnpm db:push        # SQLite tablolarını kur
pnpm dev            # http://localhost:3000
```

`http://localhost:3000` aç. Lead ilk açılışta otomatik spawn olur. Transmission
alanına ürün/feature seviyesinde bir direktif yaz — örneğin:

> "Next.js portfolyo sitesi kur ve Vercel'e deploy et."

Lead planlar, paralelleşmenin yardımı olduğu yerde helper spawn eder ve raporlar.

## Worker rolleri

Her rol odaklı bir system prompt ile gelir (`src/core/role-prompts.ts`):

| Rol        | Varsayılan model | Kapsam |
|------------|------------------|--------|
| `lead`     | opus             | Orkestratör — konuştuğun ajan |
| `backend`  | opus             | API, business logic, DB query, auth |
| `frontend` | opus             | UI, component, styling, client state |
| `db`       | opus             | Şema, migration, query performansı |
| `devops`   | opus             | Docker, CI/CD, deploy, altyapı config |
| `qa`       | haiku            | Test, regresyon avı, bug raporları |
| `watcher`  | haiku            | Salt-okuma gözlem & durum özeti |

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
- **Tailwind CSS v4** — panel arayüzü

## Klasör yapısı

```
src/
  app/            Next.js App Router (panel UI + REST API + SSE)
  components/     Panel, LeadChat, WorkerPane, TransmissionBar, ...
  core/
    spawner.ts        claude CLI subprocess başlatıcı
    worker.ts         Worker lifecycle + otonom döngü
    orchestrator.ts   WorkerPool kayıt/yönetici (singleton)
    lead.ts           Lead bootstrap + master system prompt
    role-prompts.ts   Rol bazlı system prompt'lar
    stream.ts         stream-json (NDJSON) parser
  lib/            Prisma client, in-memory pubsub
scripts/
  mcp-server.mjs      Lead'e orkestrasyon araçları sağlayan MCP server
  start.mjs           production giriş noktası (NSSM hedefi)
  *.bat               Windows servis kurulum/yönetim
prisma/
  schema.prisma       Worker + Message tabloları
```

## Güvenlik notları

- Worker'lar `--permission-mode bypassPermissions` ile çalışır — araçları
  (Bash, Edit, Write, …) onaysız çalıştırırlar. Her worker'ın çalışma dizinini
  dar ve güvenilir tut.
- Tüm worker'lar disk üzerindeki tek `~/.claude` kimlik bilgisini paylaşır.
  Worker başına yeni login yoktur; hepsi aynı token'ı okur.
- Panelde **kimlik doğrulama yok** — yalnızca `localhost`'a bağla. Önce auth
  eklemeden port 3000'i ağa açma.

## Lisans

MIT — bkz. [`LICENSE`](./LICENSE).
