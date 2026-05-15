// Lead'in son mesajlarını DB'den çek, okunabilir formatta bas.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const lead = await prisma.worker.findFirst({
  where: { role: "lead" },
  orderBy: { createdAt: "desc" },
});
if (!lead) {
  console.error("Lead bulunamadi");
  process.exit(1);
}

const msgs = await prisma.message.findMany({
  where: { workerId: lead.id },
  orderBy: { createdAt: "desc" },
  take: 30,
});

const ordered = msgs.reverse();
for (const m of ordered) {
  let payload;
  try {
    payload = JSON.parse(m.payload);
  } catch {
    payload = { raw: m.payload };
  }
  const t = payload.type ?? m.type;
  if (t === "assistant") {
    const blocks = payload.message?.content ?? [];
    for (const b of blocks) {
      if (b.type === "text") {
        console.log(`\n[assistant text]`);
        console.log(b.text);
      } else if (b.type === "tool_use") {
        console.log(
          `[tool_use] ${b.name}(${JSON.stringify(b.input).slice(0, 200)})`,
        );
      } else if (b.type === "thinking") {
        console.log(`[thinking] ${(b.thinking ?? "").slice(0, 200)}`);
      }
    }
  } else if (t === "user") {
    const c = payload.message?.content ?? payload.text;
    if (typeof c === "string") {
      console.log(`\n[user] ${c.slice(0, 300)}`);
    } else if (Array.isArray(c)) {
      for (const b of c) {
        if (b.type === "tool_result") {
          const tc =
            typeof b.content === "string"
              ? b.content
              : JSON.stringify(b.content).slice(0, 300);
          console.log(`[tool_result] ${tc.slice(0, 300)}`);
        }
      }
    }
  } else if (t === "system" && payload.subtype === "init") {
    const tools = (payload.tools ?? []).slice(0, 50);
    console.log(`\n[system init] tools (${tools.length}): ${tools.join(", ")}`);
  } else if (t === "result") {
    console.log(
      `[result/${payload.subtype}] ${(payload.result ?? "").slice(0, 100)}`,
    );
  } else {
    // skip noise
  }
}

await prisma.$disconnect();
