// Stream-json parser: gelen bytes'ı satır satır JSON'a çevirir.
// CLI her event'i bir satıra (newline-delimited JSON) basar.

import type { SDKMessage } from "./types";

export class StreamJSONParser {
  private buffer = "";

  push(chunk: Buffer | string): SDKMessage[] {
    this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");

    const messages: SDKMessage[] = [];
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
