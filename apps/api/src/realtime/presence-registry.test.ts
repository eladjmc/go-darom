import { describe, expect, it, vi } from "vitest";
import { PresenceRegistry } from "./presence-registry.js";

describe("PresenceRegistry", () => {
  it("counts multiple tabs as one online member", () => {
    const presence = new PresenceRegistry({ debounceMs: 10_000 });
    expect(presence.connect("u1")).toBe(true);
    expect(presence.connect("u1")).toBe(false);
    expect(presence.isOnline("u1")).toBe(true);
    expect(presence.disconnect("u1")).toBe(false);
    expect(presence.isOnline("u1")).toBe(true);
  });

  it("debounces offline and cancels if user reconnects", () => {
    vi.useFakeTimers();
    const offline = vi.fn();
    const presence = new PresenceRegistry({ debounceMs: 10_000 });
    presence.setOfflineHandler(offline);

    expect(presence.connect("u1")).toBe(true);
    presence.disconnect("u1");
    expect(presence.isOnline("u1")).toBe(true);
    expect(offline).not.toHaveBeenCalled();

    // Reconnect before debounce elapses
    expect(presence.connect("u1")).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(offline).not.toHaveBeenCalled();
    expect(presence.isOnline("u1")).toBe(true);

    presence.disconnect("u1");
    vi.advanceTimersByTime(10_000);
    expect(offline).toHaveBeenCalledWith("u1");
    expect(presence.isOnline("u1")).toBe(false);
    vi.useRealTimers();
  });
});
