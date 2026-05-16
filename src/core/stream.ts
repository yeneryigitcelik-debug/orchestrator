// Stream-json parser: gelen bytes'ı satır satır JSON'a çevirir.
// CLI her event'i bir satıra (newline-delimited JSON) basar.

import type { SDKMessage } from "./types";

// Newline'sız tek satır tavanı. CLI satır-sınırlı JSON basar; bunu aşan
// bir tampon = bozuk/akmayan stream → sınırsız büyümesin diye atılır.
const MAX_LINE_BUFFER = 4 * 1024 * 1024; // 4 MB

export class StreamJSONParser {
  private buffer = "";

  push(chunk: Buffer | string): SDKMessage[] {
    this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");

    const messages: SDKMessage[] = [];

    // Defensive: tampon newline olmadan absürt büyüdüyse bozuk akış — at.
    if (this.buffer.length > MAX_LINE_BUFFER && this.buffer.indexOf("\n") === -1) {
      const dropped = this.buffer.length;
      this.buffer = "";
      messages.push({
        type: "_parse_error",
        raw: "",
        error: `line buffer overflow: ${dropped} byte newline'sız atıldı`,
      } as unknown as SDKMessage);
      return messages;
    }

    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as SDKMessage;
        messages.push(parsed);
      } catch (err) {
        // CLI bazen log/uyarı basabilir; sessizce yut, debug log için bırak
        messages.push({
          type: "_parse_error",
          raw: line,
          error: String(err),
        } as unknown as SDKMessage);
      }
    }
    return messages;
  }

  /** Tampondaki yarım kalan içerik — process kapanırken çağrılır. */
  drain(): SDKMessage[] {
    if (!this.buffer.trim()) return [];
    const line = this.buffer.trim();
    this.buffer = "";
    try {
      return [JSON.parse(line) as SDKMessage];
    } catch {
      return [];
    }
  }
}
