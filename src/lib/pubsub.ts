// In-memory pub/sub — worker → SSE bağlantıları için.
// Her worker'ın kendi kanalı var (topic = workerId). Ayrıca subscribeAll ile
// tüm kanalların event'leri tek bir multiplex stream'e (/api/stream) akıtılır.

type Listener = (event: unknown) => void;
type GlobalListener = (topic: string, event: unknown) => void;

class PubSub {
  private channels = new Map<string, Set<Listener>>();
  private globalListeners = new Set<GlobalListener>();

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

  /** Tüm topic'lerdeki event'leri dinle — Mission Control multiplex SSE'si için. */
  subscribeAll(fn: GlobalListener): () => void {
    this.globalListeners.add(fn);
    return () => {
      this.globalListeners.delete(fn);
    };
  }

  publish(topic: string, event: unknown): void {
    const set = this.channels.get(topic);
    if (set) {
      for (const fn of set) {
        try {
          fn(event);
        } catch {
          // tek dinleyici çakılırsa diğerlerini etkilemesin
        }
      }
    }
    for (const fn of this.globalListeners) {
      try {
        fn(topic, event);
      } catch {
        // yoksay
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
