/**
 * @vitest-environment happy-dom
 */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChatMessageDto } from "@go-darom/shared";
import { ChatComposer } from "./ChatComposer";
import { MessageThread } from "./MessageThread";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function msg(partial: Partial<ChatMessageDto> & Pick<ChatMessageDto, "id" | "body" | "sender">): ChatMessageDto {
  return {
    threadId: "t1",
    threadSeq: 1,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    ...partial,
  };
}

function ChatHarness({
  register,
}: {
  register: (api: {
    setDraft: (v: string) => void;
    pushIncoming: (m: ChatMessageDto) => void;
    tickPresence: () => void;
    reconnect: () => void;
    getDraft: () => string;
  }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessageDto[]>([
    msg({
      id: "m0",
      body: "שלום",
      threadSeq: 1,
      sender: { id: "other", nickname: "חבר", avatarUrl: null },
    }),
  ]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set(["other"]));

  register({
    setDraft,
    getDraft: () => draft,
    pushIncoming: (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    },
    tickPresence: () => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (next.has("other")) next.delete("other");
        else next.add("other");
        return next;
      });
    },
    reconnect: () => {
      setOnlineIds(new Set(["other"]));
    },
  });

  return (
    <div data-testid="chat-harness" data-draft={draft} data-online={onlineIds.size}>
      <MessageThread messages={messages} myUserId="me" emptyLabel="ריק" />
      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSend={async () => undefined}
        placeholder="טיוטה"
      />
    </div>
  );
}

describe("chat draft stability", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("keeps an unsent draft when an incoming message arrives", async () => {
    let api: Parameters<Parameters<typeof ChatHarness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<ChatHarness register={(a) => (api = a)} />);
    });

    await act(async () => {
      api!.setDraft("טיוטה חשובה");
    });
    expect(container.querySelector("[data-draft]")?.getAttribute("data-draft")).toBe("טיוטה חשובה");
    expect(container.querySelector("textarea")!.value).toBe("טיוטה חשובה");

    await act(async () => {
      api!.pushIncoming(
        msg({
          id: "m-in",
          body: "הודעה נכנסת",
          threadSeq: 2,
          sender: { id: "other", nickname: "חבר", avatarUrl: null },
        }),
      );
    });

    expect(container.querySelector("textarea")!.value).toBe("טיוטה חשובה");
    expect(container.textContent).toContain("הודעה נכנסת");
  });

  it("keeps draft across presence updates", async () => {
    let api: Parameters<Parameters<typeof ChatHarness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<ChatHarness register={(a) => (api = a)} />);
    });

    await act(async () => {
      api!.setDraft("נוכחות");
    });
    await act(async () => {
      api!.tickPresence();
      api!.tickPresence();
    });

    expect(container.querySelector("textarea")!.value).toBe("נוכחות");
  });

  it("keeps draft across simulated socket reconnect", async () => {
    let api: Parameters<Parameters<typeof ChatHarness>[0]["register"]>[0] | null = null;
    await act(async () => {
      root.render(<ChatHarness register={(a) => (api = a)} />);
    });

    await act(async () => {
      api!.setDraft("אחרי ניתוק");
    });
    await act(async () => {
      api!.reconnect();
    });

    expect(container.querySelector("textarea")!.value).toBe("אחרי ניתוק");
  });

  it("maps mine bubbles to physical left and others to physical right classes", async () => {
    const mine = msg({
      id: "mine",
      body: "שלי",
      sender: { id: "me", nickname: "אני", avatarUrl: null },
    });
    const theirs = msg({
      id: "theirs",
      body: "שלהם",
      sender: { id: "other", nickname: "חבר", avatarUrl: null },
    });

    await act(async () => {
      root.render(<MessageThread messages={[theirs, mine]} myUserId="me" emptyLabel="ריק" />);
    });

    expect(container.querySelector('.chat-bubble-row[data-mine="1"]')?.classList.contains("is-mine")).toBe(true);
    expect(container.querySelector('.chat-bubble-row[data-mine="0"]')?.classList.contains("is-theirs")).toBe(true);
  });
});
