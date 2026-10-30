/**
 * @vitest-environment happy-dom
 */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChatMessageDto } from "@go-darom/shared";
import { MessageThread } from "./MessageThread";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeMessages(count: number, startSeq = 1): ChatMessageDto[] {
  return Array.from({ length: count }, (_, i) => {
    const seq = startSeq + i;
    return {
      id: `m${seq}`,
      threadId: "t1",
      threadSeq: seq,
      body: `הודעה ${seq}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
      deletedAt: null,
      sender: {
        id: seq % 2 === 0 ? "me" : "other",
        nickname: seq % 2 === 0 ? "אני" : "חבר",
        avatarUrl: null,
      },
    };
  });
}

function mockScrollerMetrics(el: HTMLElement, metrics: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => metrics.scrollHeight });
  Object.defineProperty(el, "clientHeight", { configurable: true, get: () => metrics.clientHeight });
  let top = 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      top = v;
    },
  });
  return {
    get top() {
      return top;
    },
    setHeight(h: number) {
      metrics.scrollHeight = h;
    },
  };
}

function Harness({
  register,
  initial = 0,
}: {
  initial?: number;
  register: (api: {
    setCount: (n: number) => void;
    prepend: (n: number) => void;
    append: (n: number) => void;
  }) => void;
}) {
  const [messages, setMessages] = useState(() => makeMessages(initial));
  register({
    setCount: (n) => setMessages(makeMessages(n)),
    prepend: (n) => {
      setMessages((prev) => {
        const firstSeq = prev[0]?.threadSeq ?? 1;
        const start = firstSeq - n;
        const older = Array.from({ length: n }, (_, i) => {
          const seq = start + i;
          return {
            id: `old-${seq}`,
            threadId: "t1",
            threadSeq: seq,
            body: `ישנה ${seq}`,
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
            deletedAt: null,
            sender: { id: "other", nickname: "חבר", avatarUrl: null },
          } satisfies ChatMessageDto;
        });
        return [...older, ...prev];
      });
    },
    append: (n) => {
      setMessages((prev) => {
        const lastSeq = prev[prev.length - 1]?.threadSeq ?? 0;
        return [...prev, ...makeMessages(n, lastSeq + 1)];
      });
    },
  });
  return (
    <div style={{ height: 240 }}>
      <MessageThread threadKey="t1" messages={messages} myUserId="me" emptyLabel="ריק" />
    </div>
  );
}

describe("MessageThread scroll behavior", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("scrolls to bottom on initial load with many messages", async () => {
    let api: Parameters<Parameters<typeof Harness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<Harness initial={0} register={(a) => (api = a)} />);
    });
    const el = container.querySelector(".msg-thread") as HTMLElement;
    const metrics = mockScrollerMetrics(el, { scrollHeight: 40, clientHeight: 240 });

    await act(async () => {
      metrics.setHeight(200 * 40);
      api!.setCount(200);
    });

    expect(metrics.top).toBe(200 * 40);
  });

  it("does not jump to bottom when scrolled up and a message arrives", async () => {
    let api: Parameters<Parameters<typeof Harness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<Harness initial={50} register={(a) => (api = a)} />);
    });
    const el = container.querySelector(".msg-thread") as HTMLElement;
    const metrics = mockScrollerMetrics(el, { scrollHeight: 50 * 40, clientHeight: 240 });

    await act(async () => {
      // Resync settledScrollHeight under mocked metrics, then scroll up.
      api!.setCount(50);
    });
    await act(async () => {
      el.scrollTop = 80;
      el.dispatchEvent(new Event("scroll"));
    });
    const frozen = metrics.top;

    await act(async () => {
      metrics.setHeight(51 * 40);
      api!.append(1);
    });

    expect(metrics.top).toBe(frozen);
  });

  it("preserves reading position when older messages are prepended", async () => {
    let api: Parameters<Parameters<typeof Harness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<Harness initial={50} register={(a) => (api = a)} />);
    });
    const el = container.querySelector(".msg-thread") as HTMLElement;
    const metrics = mockScrollerMetrics(el, { scrollHeight: 2000, clientHeight: 240 });

    await act(async () => {
      api!.setCount(50);
    });
    await act(async () => {
      el.scrollTop = 400;
      el.dispatchEvent(new Event("scroll"));
    });

    await act(async () => {
      metrics.setHeight(4000);
      api!.prepend(50);
    });

    // +2000 height delta applied to scrollTop
    expect(metrics.top).toBe(2400);
  });

  it("renders empty / short / long lists without throwing", async () => {
    for (const n of [0, 5, 50, 200]) {
      await act(async () => {
        root.render(
          <MessageThread threadKey={`k-${n}`} messages={makeMessages(n)} myUserId="me" emptyLabel="ריק" />,
        );
      });
      expect(container.querySelector(".msg-thread")).toBeTruthy();
      if (n === 0) expect(container.textContent).toContain("ריק");
      else expect(container.querySelectorAll(".chat-bubble-row").length).toBe(n);
    }
  });
});
