// In-memory pub/sub — worker → SSE bağlantıları için.
// Her worker'ın kendi kanalı var; topic = workerId.

type Listener = (event: unknown) => void;

class PubSub {
  private channels = new Map<string, Set<Listener>>();

  subscribe(topic: string, fn: Listener): () => void {
    let set = this.channels.get(topic);
    if (!set) {
      set = new Set();
      this.channels.set(topic, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0) this.channels.delete(topic);
    };
  }

  publish(topic: string, event: unknown): void {
    const set = this.channels.get(topic);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(event);
      } catch {
        // tek dinleyici çakılırsa diğerlerini etkilemesin
      }
    }
  }

  subscribersOf(topic: string): number {
    return this.channels.get(topic)?.size ?? 0;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __pubsub: PubSub | undefined;
}

export const pubsub: PubSub = globalThis.__pubsub ?? new PubSub();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pubsub = pubsub;
}
