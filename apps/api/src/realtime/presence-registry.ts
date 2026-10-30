import { PRESENCE_OFFLINE_DEBOUNCE_MS } from "@go-darom/shared";

type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Connection-count presence with offline debounce.
 * Multi-tab = one online user. Offline broadcasts only after debounce unless cancelled by reconnect.
 */
export class PresenceRegistry {
  private readonly counts = new Map<string, number>();
  private readonly pendingOffline = new Map<string, TimerHandle>();
  private readonly debounceMs: number;
  private readonly schedule: typeof setTimeout;
  private readonly cancel: typeof clearTimeout;
  private onOffline: ((userId: string) => void) | null = null;

  constructor(
    options: {
      debounceMs?: number;
      setTimeoutFn?: typeof setTimeout;
      clearTimeoutFn?: typeof clearTimeout;
    } = {},
  ) {
    this.debounceMs = options.debounceMs ?? PRESENCE_OFFLINE_DEBOUNCE_MS;
    this.schedule = options.setTimeoutFn ?? setTimeout;
    this.cancel = options.clearTimeoutFn ?? clearTimeout;
  }

  setOfflineHandler(handler: (userId: string) => void) {
    this.onOffline = handler;
  }

  /** @returns true if the user newly became online (including cancel of pending offline). */
  connect(userId: string): boolean {
    const pending = this.pendingOffline.get(userId);
    if (pending) {
      this.cancel(pending);
      this.pendingOffline.delete(userId);
      const next = (this.counts.get(userId) ?? 0) + 1;
      this.counts.set(userId, next);
      // Still considered online during debounce — no "became online" fanout needed.
      return false;
    }

    const prev = this.counts.get(userId) ?? 0;
    this.counts.set(userId, prev + 1);
    return prev === 0;
  }

  /**
   * Decrements connection count. When count hits 0, schedules offline after debounce.
   * @returns true only if already offline immediately (unused with debounce); prefer handler.
   */
  disconnect(userId: string): boolean {
    const current = this.counts.get(userId) ?? 0;
    if (current <= 1) {
      this.counts.delete(userId);
      if (current === 1 && !this.pendingOffline.has(userId)) {
        const handle = this.schedule(() => {
          this.pendingOffline.delete(userId);
          // Only fire if still no connections
          if ((this.counts.get(userId) ?? 0) === 0) {
            this.onOffline?.(userId);
          }
        }, this.debounceMs);
        this.pendingOffline.set(userId, handle);
      }
      return false;
    }
    this.counts.set(userId, current - 1);
    return false;
  }

  isOnline(userId: string): boolean {
    return (this.counts.get(userId) ?? 0) > 0 || this.pendingOffline.has(userId);
  }

  onlineUserIds(): string[] {
    const ids = new Set<string>([...this.counts.keys(), ...this.pendingOffline.keys()]);
    return [...ids];
  }

  /** Test helper */
  flushPendingForTests() {
    for (const [userId, handle] of this.pendingOffline) {
      this.cancel(handle);
      this.pendingOffline.delete(userId);
      if ((this.counts.get(userId) ?? 0) === 0) {
        this.onOffline?.(userId);
      }
    }
  }
}
