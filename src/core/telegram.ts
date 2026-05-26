// Telegram bot — orchestrator için uzaktan kontrol arayüzü.
// Polling tabanlı (NAT arkasından çalışır, tunnel gerekmez).
// TELEGRAM_BOT_TOKEN yoksa sessizce devre dışı kalır.
//
// Komutlar:
//   /start, /help           → komut listesi
//   /status                 → autonomous mode + run özeti
//   /pause [reason]         → controller'ı duraklat
//   /resume                 → checkpoint sonrası devam
//   /stop [reason]          → autonomous run'ı kapat
//   /begin                  → autonomous run başlat
//   /say <text>             → Lead'e mesaj yolla (chat)
//   /backlog [pending|all]  → task backlog
//   /addtask <title>        → backlog'a yeni task
//   /thoughts [N]           → son N düşünce
//   /answer <text>          → en yeni pending soruyu cevapla
//   /run                    → aktif run özeti
//
// Soru gelirse bot mesaj atar; o mesaja REPLY atılırsa otomatik cevap olarak alınır.

import TelegramBotLib from "node-telegram-bot-api";
import type TelegramBotType from "node-telegram-bot-api";
import { pubsub } from "../lib/pubsub";
import { orchestrator } from "./orchestrator";
import {
  addTask,
  getConfig,
  getCurrentRun,
  listTasks,
  recallThoughts,
} from "./autonomous-store";
import { autonomousController } from "./autonomous";
import {
  answerQuestion,
  listPendingQuestions,
} from "./questions";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

interface QuestionMessage {
  questionId: string;
  chatId: number;
  messageId: number;
}

class TelegramBotWrapper {
  private bot: TelegramBotType | null = null;
  private booted = false;
  // Telegram message_id → questionId — kullanıcı reply atınca soru ile eşleştir
  private replyMap = new Map<number, QuestionMessage>();

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    if (!TOKEN) {
      console.log(
        "[telegram] TELEGRAM_BOT_TOKEN yok — Telegram bot devre dışı.",
      );
      return;
    }

    try {
      const Ctor = TelegramBotLib as unknown as new (
        token: string,
        opts?: { polling?: boolean },
      ) => TelegramBotType;
      this.bot = new Ctor(TOKEN, { polling: true });
    } catch (err) {
      console.error("[telegram] bot oluşturulamadı", err);
      return;
    }

    this.bot.on("polling_error", (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[telegram] polling error:", msg.slice(0, 200));
    });

    this.attachCommands();
    this.subscribeToPubsub();
    this.subscribeToLeadOutput();

    console.log(
      `[telegram] bot polling aktif (chatId allowlist=${ALLOWED_CHAT_ID ?? "açık"})`,
    );

    if (ALLOWED_CHAT_ID) {
      void this.notify(
        "🤖 Orchestrator hazır. Direkt yaz, Lead'e gider. /help için komutlar.",
      );
    }
  }

  private seenChatIds = new Set<string>();

  private isAuthorized(chatId: number): boolean {
    const id = String(chatId);
    // Chat ID henüz set edilmediyse keşif modu: ilk gelen chat'i konsola yaz
    if (!ALLOWED_CHAT_ID) {
      if (!this.seenChatIds.has(id)) {
        this.seenChatIds.add(id);
        console.log(
          `\n[telegram] ⚡ Bir chat bot'a yazdı. chat_id=${id}\n` +
            `[telegram] Sadece bu chat'in kabul edilmesi için .env'e ekle:\n` +
            `[telegram]   TELEGRAM_CHAT_ID="${id}"\n` +
            `[telegram] Sonra daemon'ı yeniden başlat.\n`,
        );
      }
      return true;
    }
    return id === ALLOWED_CHAT_ID;
  }

  /** ALLOWED_CHAT_ID set ise oraya bildirim at; yoksa noop. */
  async notify(text: string): Promise<void> {
    if (!this.bot || !ALLOWED_CHAT_ID) return;
    try {
      await this.bot.sendMessage(ALLOWED_CHAT_ID, text, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      } as Parameters<TelegramBotType["sendMessage"]>[2]);
    } catch (err) {
      console.error("[telegram] notify failed:", err);
    }
  }

  /** Soru bildirimi — choices varsa inline keyboard; her durumda reply ile de cevaplanır. */
  private async notifyQuestion(question: {
    id: string;
    question: string;
    choices: string[] | null;
  }): Promise<void> {
    if (!this.bot || !ALLOWED_CHAT_ID) return;
    const lines = [`❓ *Lead sana soruyor:*`, "", question.question];
    lines.push("", "_butona bas, veya bu mesaja reply at, ya da_ `/answer <metin>`");
    // Inline keyboard: her choice bir buton, callback_data = "ans:<questionId>:<index>"
    let replyMarkup: { inline_keyboard: { text: string; callback_data: string }[][] } | undefined;
    if (question.choices?.length) {
      const rows: { text: string; callback_data: string }[][] = [];
      question.choices.forEach((c, i) => {
        rows.push([
          {
            text: c.length > 30 ? `${c.slice(0, 27)}…` : c,
            callback_data: `ans:${question.id}:${i}`,
          },
        ]);
      });
      replyMarkup = { inline_keyboard: rows };
    }
    try {
      const sent = await this.bot.sendMessage(ALLOWED_CHAT_ID, lines.join("\n"), {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      } as Parameters<TelegramBotType["sendMessage"]>[2]);
      const numericChatId = Number(ALLOWED_CHAT_ID);
      this.replyMap.set(sent.message_id, {
        questionId: question.id,
        chatId: numericChatId,
        messageId: sent.message_id,
      });
    } catch (err) {
      console.error("[telegram] notifyQuestion failed:", err);
    }
  }

  /** Uzun Lead mesajını Telegram'ın 4096 byte limitine göre parçalayıp gönderir. */
  private async sendPlain(text: string): Promise<void> {
    if (!this.bot || !ALLOWED_CHAT_ID) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const MAX = 3500;
    let i = 0;
    while (i < trimmed.length) {
      let end = Math.min(i + MAX, trimmed.length);
      if (end < trimmed.length) {
        const lastBreak = trimmed.lastIndexOf("\n", end);
        if (lastBreak > i + 200) end = lastBreak;
      }
      try {
        await this.bot.sendMessage(ALLOWED_CHAT_ID, trimmed.slice(i, end), {
          disable_web_page_preview: true,
        } as Parameters<TelegramBotType["sendMessage"]>[2]);
      } catch (err) {
        console.error("[telegram] sendPlain failed", err);
        return;
      }
      i = end;
    }
  }

  /** Lead'in son result text'i geldiğinde Telegram'a düşür. */
  private subscribeToLeadOutput(): void {
    pubsub.subscribeAll((topic, raw) => {
      // Sadece Lead'in kendi topic'i
      const lead = orchestrator.getLead();
      if (!lead || lead.id !== topic) return;
      const ev = raw as { type?: string; subtype?: string; result?: string };
      // result/success → final turn text
      if (ev.type === "result" && ev.subtype === "success" && ev.result) {
        const t = ev.result.trim();
        // Çok kısa otomatik onaylar (örn. "OK") spam yapmasın
        if (t.length < 4) return;
        void this.sendPlain(`💬 ${t}`);
      }
    });
  }

  private subscribeToPubsub(): void {
    pubsub.subscribe("autonomous", (raw) => {
      const ev = raw as { type?: string; [k: string]: unknown };
      if (!ev?.type) return;
      switch (ev.type) {
        case "checkpoint.requested": {
          const t = ev.thought as { content?: string } | undefined;
          void this.notify(
            `🛑 *Checkpoint istendi*\n\n${t?.content ?? ""}\n\n_Devam etmek için_ /resume`,
          );
          break;
        }
        case "drift.alarm":
          void this.notify(
            `⚠️ *Drift uyarısı*\n\n${(ev.message as string) ?? ""}\n\nController duraklatıldı. /resume veya /stop.`,
          );
          break;
        case "question.asked": {
          const q = ev.question as
            | { id: string; question: string; choices: string[] | null }
            | undefined;
          if (q) void this.notifyQuestion(q);
          break;
        }
        case "task.blocked": {
          const t = ev.task as { title?: string; blockReason?: string } | undefined;
          void this.notify(
            `🚧 *Task bloklandı:* ${t?.title ?? ""}\n\nSebep: ${t?.blockReason ?? "-"}`,
          );
          break;
        }
        case "iter.cap.hit": {
          void this.notify(
            `⛔ Iteration cap'e çarpıldı (${ev.iteration as number}/${ev.cap as number}). Autonomous run durduruldu.`,
          );
          break;
        }
        case "run.ended": {
          const reason = ev.reason as string;
          void this.notify(`✅ Autonomous run kapandı (${reason}).`);
          break;
        }
        case "run.started": {
          void this.notify("▶️ Autonomous run başladı.");
          break;
        }
      }
    });
  }

  private attachCommands(): void {
    if (!this.bot) return;
    const bot = this.bot;

    bot.onText(/^\/start$|^\/help$/i, (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      void bot.sendMessage(
        msg.chat.id,
        [
          "🤖 *Orchestrator Bot*",
          "",
          "/status — durum",
          "/begin — autonomous başlat",
          "/stop — autonomous bitir",
          "/pause — duraklat",
          "/resume — devam et",
          "/say <metin> — Lead'e mesaj",
          "/backlog — pending task listesi",
          "/addtask <başlık> — yeni task ekle",
          "/thoughts [N] — son düşünceler",
          "/answer <metin> — en yeni soruyu cevapla (veya soru mesajına reply at)",
          "/run — aktif run özeti",
        ].join("\n"),
        { parse_mode: "Markdown" } as Parameters<typeof bot.sendMessage>[2],
      );
    });

    bot.onText(/^\/status\b/i, async (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      try {
        const cfg = await getConfig();
        const run = await getCurrentRun();
        const ctrl = autonomousController.getState();
        const lead = orchestrator.getLead();
        const lines = [
          `*Autonomous:* ${cfg.autonomousMode ? "ON" : "off"}${ctrl.paused ? " (paused)" : ""}`,
          `*Lead:* ${lead?.status ?? "yok"}`,
          `*Run:* ${run ? `iter ${run.iterations}/${cfg.maxIterations}, checkpoint ${run.checkpointsHit}` : "yok"}`,
          `*Tick:* ${cfg.tickIntervalMs}ms, checkpoint @ ${cfg.checkpointEvery}`,
        ];
        if (ctrl.pauseReason) lines.push(`*Pause sebebi:* ${ctrl.pauseReason}`);
        await bot.sendMessage(msg.chat.id, lines.join("\n"), {
          parse_mode: "Markdown",
        } as Parameters<typeof bot.sendMessage>[2]);
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Hata: ${(err as Error).message}`);
      }
    });

    bot.onText(/^\/begin\b/i, async (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const run = await autonomousController.startAutonomous("telegram");
      await bot.sendMessage(
        msg.chat.id,
        `▶️ Autonomous başladı (run ${run.id.slice(0, 8)}).`,
      );
    });

    bot.onText(/^\/stop\b(.*)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const reason = (match?.[1] ?? "").trim() || "telegram-stop";
      await autonomousController.stopAutonomous(reason);
      await bot.sendMessage(msg.chat.id, `⏹ Autonomous durduruldu (${reason}).`);
    });

    bot.onText(/^\/pause\b(.*)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const reason = (match?.[1] ?? "").trim() || "telegram-pause";
      autonomousController.pause(reason);
      await bot.sendMessage(msg.chat.id, `⏸ Duraklatıldı (${reason}).`);
    });

    bot.onText(/^\/resume\b/i, async (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      autonomousController.resume();
      await bot.sendMessage(msg.chat.id, "▶️ Devam.");
    });

    bot.onText(/^\/say\s+([\s\S]+)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const text = (match?.[1] ?? "").trim();
      if (!text) return;
      try {
        const lead = orchestrator.getLead();
        if (!lead) {
          await bot.sendMessage(msg.chat.id, "Lead bulunamadı.");
          return;
        }
        await orchestrator.send(lead.id, text);
        await bot.sendMessage(msg.chat.id, "📨 Lead'e gönderildi.");
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Hata: ${(err as Error).message}`);
      }
    });

    bot.onText(/^\/backlog\b(.*)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const arg = (match?.[1] ?? "").trim().toLowerCase();
      const filter = arg && arg !== "all" ? { status: arg as "pending" } : {};
      const tasks = await listTasks(filter);
      if (tasks.length === 0) {
        await bot.sendMessage(msg.chat.id, "Backlog boş.");
        return;
      }
      const lines = tasks.slice(0, 20).map(
        (t) =>
          `• [${t.status[0]}] *${t.title}* (p${t.priority}, ${t.source})`,
      );
      if (tasks.length > 20) lines.push(`… ve ${tasks.length - 20} daha`);
      await bot.sendMessage(msg.chat.id, lines.join("\n"), {
        parse_mode: "Markdown",
      } as Parameters<typeof bot.sendMessage>[2]);
    });

    bot.onText(/^\/addtask\s+([\s\S]+)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const title = (match?.[1] ?? "").trim();
      if (!title) return;
      const task = await addTask({ title, source: "telegram" });
      await bot.sendMessage(msg.chat.id, `➕ Task eklendi: ${task.title}`);
    });

    bot.onText(/^\/thoughts\b(.*)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const n = parseInt((match?.[1] ?? "").trim(), 10) || 10;
      const ts = await recallThoughts({ limit: Math.min(Math.max(n, 1), 30) });
      if (ts.length === 0) {
        await bot.sendMessage(msg.chat.id, "Düşünce kaydı yok.");
        return;
      }
      const lines = ts.map((t) => {
        const time = new Date(t.createdAt).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `_${time}_ [${t.type}] ${t.content.slice(0, 200)}`;
      });
      await bot.sendMessage(msg.chat.id, lines.join("\n\n"), {
        parse_mode: "Markdown",
      } as Parameters<typeof bot.sendMessage>[2]);
    });

    bot.onText(/^\/run\b/i, async (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const run = await getCurrentRun();
      if (!run) {
        await bot.sendMessage(msg.chat.id, "Aktif run yok.");
        return;
      }
      const mins = Math.floor((Date.now() - new Date(run.startedAt).getTime()) / 60_000);
      const lines = [
        `*Run:* ${run.id.slice(0, 8)}`,
        `*Süre:* ${mins} dk`,
        `*Iter:* ${run.iterations}`,
        `*Task tamamlandı:* ${run.tasksCompleted}`,
        `*Checkpoint:* ${run.checkpointsHit}`,
        `*Tetiklendi:* ${run.triggeredBy}`,
      ];
      await bot.sendMessage(msg.chat.id, lines.join("\n"), {
        parse_mode: "Markdown",
      } as Parameters<typeof bot.sendMessage>[2]);
    });

    bot.onText(/^\/answer\s+([\s\S]+)/i, async (msg: TelegramBotType.Message, match) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      const answer = (match?.[1] ?? "").trim();
      if (!answer) return;
      const pending = await listPendingQuestions();
      if (pending.length === 0) {
        await bot.sendMessage(msg.chat.id, "Bekleyen soru yok.");
        return;
      }
      try {
        // En yeni pending soruyu cevapla
        const target = pending[pending.length - 1];
        await answerQuestion(target.id, answer);
        await bot.sendMessage(msg.chat.id, `✅ Cevap iletildi (${target.id.slice(0, 8)}).`);
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Hata: ${(err as Error).message}`);
      }
    });

    // Inline keyboard butonuna basıldığında — soru cevabı
    bot.on("callback_query", async (cb: TelegramBotType.CallbackQuery) => {
      if (!cb.from?.id || !this.isAuthorized(cb.from.id)) {
        try {
          await bot.answerCallbackQuery(cb.id, { text: "Yetkisiz." });
        } catch {
          /* yoksay */
        }
        return;
      }
      const data = cb.data ?? "";
      if (!data.startsWith("ans:")) {
        await bot.answerCallbackQuery(cb.id).catch(() => {});
        return;
      }
      const parts = data.split(":");
      const qid = parts[1];
      const idx = parseInt(parts[2] ?? "0", 10);
      try {
        // Soru var mı + choices'tan label'ı al
        const res = await fetch(`http://127.0.0.1:${process.env.DAEMON_PORT ?? 3006}/api/questions/${qid}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          question: { choices: string[] | null; status: string } | null;
        };
        const q = body.question;
        if (!q) throw new Error("Soru bulunamadı");
        if (q.status !== "pending") {
          await bot.answerCallbackQuery(cb.id, { text: `Soru artık ${q.status}.` });
          return;
        }
        const label = q.choices?.[idx];
        if (!label) throw new Error("Seçenek bulunamadı");
        await answerQuestion(qid, label);
        await bot.answerCallbackQuery(cb.id, { text: `✅ ${label}` });
        // Mesajın klavyesini kaldır — tekrar tıklanmasın
        if (cb.message) {
          await bot
            .editMessageReplyMarkup(
              { inline_keyboard: [] } as TelegramBotType.InlineKeyboardMarkup,
              {
                chat_id: cb.message.chat.id,
                message_id: cb.message.message_id,
              },
            )
            .catch(() => {});
          this.replyMap.delete(cb.message.message_id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "hata";
        await bot.answerCallbackQuery(cb.id, { text: `Hata: ${msg}` }).catch(() => {});
      }
    });

    // Genel mesaj handler: komut DEĞİL ise → Lead'e ilet (chat modu).
    // Eğer soru mesajına reply ise → soru cevabı olarak al.
    bot.on("message", async (msg: TelegramBotType.Message) => {
      if (!this.isAuthorized(msg.chat.id)) return;
      if (!msg.text) return;
      if (msg.text.startsWith("/")) return; // komutlar onText handler'larında

      // 1) Soru reply'i mi?
      if (msg.reply_to_message) {
        const entry = this.replyMap.get(msg.reply_to_message.message_id);
        if (entry) {
          try {
            await answerQuestion(entry.questionId, msg.text);
            await bot.sendMessage(msg.chat.id, "✅ Cevap iletildi.", {
              reply_to_message_id: msg.message_id,
            } as Parameters<typeof bot.sendMessage>[2]);
            this.replyMap.delete(msg.reply_to_message.message_id);
            return;
          } catch (err) {
            await bot.sendMessage(msg.chat.id, `Hata: ${(err as Error).message}`);
            return;
          }
        }
        // Reply ama soru değil — Lead'e mesaj olarak iletilir
      }

      // 2) Lead'e chat mesajı olarak ilet
      try {
        const lead = orchestrator.getLead();
        if (!lead) {
          await bot.sendMessage(
            msg.chat.id,
            "Lead bulunamadı. /status ile kontrol et.",
          );
          return;
        }
        await orchestrator.send(lead.id, msg.text);
        // Ack: kısa ✓ tikleyici, Lead cevabı pubsub üzerinden zaten gelecek
        try {
          await (
            bot as unknown as {
              setMessageReaction: (
                chatId: number,
                messageId: number,
                opts: { reaction: { type: string; emoji: string }[] },
              ) => Promise<unknown>;
            }
          ).setMessageReaction?.(msg.chat.id, msg.message_id, {
            reaction: [{ type: "emoji", emoji: "👀" }],
          });
        } catch {
          /* reaction API yoksa yoksay */
        }
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Hata: ${(err as Error).message}`);
      }
    });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __telegramBot: TelegramBotWrapper | undefined;
}

export const telegramBot: TelegramBotWrapper =
  globalThis.__telegramBot ?? new TelegramBotWrapper();

if (process.env.NODE_ENV !== "production") {
  globalThis.__telegramBot = telegramBot;
}
