import { FormEvent, KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { GameChatMessageDto } from "@go-darom/shared";
import { useRealtime } from "../realtime/RealtimeProvider";
import { fetchGameChatMessages, postGameChatMessage } from "./game-chat-api";

type Props = {
  token: string;
  gameId: string;
  myUserId: string;
  readOnly: boolean;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Dedicated game-room chat (ADR-017) — always-visible compact log under controls.
 */
export function GameRoomChat({ token, gameId, myUserId, readOnly }: Props) {
  const { socket } = useRealtime();
  const titleId = useId();
  const logRef = useRef<HTMLDivElement | null>(null);
  const stickBottom = useRef(true);
  const [items, setItems] = useState<GameChatMessageDto[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchGameChatMessages(token, gameId);
      setItems(page.items);
      setNextBefore(page.nextBefore);
      setError(null);
      stickBottom.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינת הצ'אט נכשלה");
    } finally {
      setLoading(false);
    }
  }, [token, gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("game-chat:join", { gameId }, () => undefined);
    const onMsg = (payload: { message?: GameChatMessageDto }) => {
      const message = payload?.message;
      if (!message || message.gameId !== gameId) return;
      setItems((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    };
    socket.on("game-chat:new", onMsg);
    const onConnect = () => {
      socket.emit("game-chat:join", { gameId }, () => undefined);
      void load();
    };
    socket.on("connect", onConnect);
    return () => {
      socket.emit("game-chat:leave", { gameId });
      socket.off("game-chat:new", onMsg);
      socket.off("connect", onConnect);
    };
  }, [socket, gameId, load]);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (!el || !stickBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [items]);

  const loadOlder = async () => {
    if (nextBefore == null || loadingOlder) return;
    const el = logRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const page = await fetchGameChatMessages(token, gameId, nextBefore);
      stickBottom.current = false;
      setItems((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...page.items.filter((m) => !ids.has(m.id)), ...prev];
      });
      setNextBefore(page.nextBefore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (text: string) => {
    if (readOnly) return;
    setSending(true);
    try {
      const res = await postGameChatMessage(token, gameId, text, crypto.randomUUID());
      stickBottom.current = true;
      setItems((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || readOnly) return;
    void send(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const text = draft.trim();
      if (!text || sending || readOnly) return;
      void send(text);
    }
  };

  return (
    <div
      id="game-chat-panel"
      className="game-chat-dock"
      aria-labelledby={titleId}
      data-testid="game-chat-panel"
    >
      <header className="game-chat-dock-header">
        <strong id={titleId}>צ&apos;אט המשחק</strong>
        {readOnly ? (
          <span className="game-chat-readonly-banner" role="status">
            לקריאה בלבד
          </span>
        ) : null}
      </header>

      <div className="game-chat-dock-body">
        <div
          className="game-chat-log"
          ref={logRef}
          data-testid="game-chat-log"
          onScroll={() => {
            const el = logRef.current;
            if (!el) return;
            stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
        >
          {nextBefore != null ? (
            <button
              type="button"
              className="game-chat-load-older"
              disabled={loadingOlder}
              onClick={() => void loadOlder()}
            >
              {loadingOlder ? "טוען…" : "הודעות קודמות"}
            </button>
          ) : null}
          {loading ? <p className="game-chat-empty">טוען…</p> : null}
          {error ? (
            <p className="game-chat-empty is-error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <p className="game-chat-empty">אין הודעות עדיין</p>
          ) : null}
          {items.map((m) => {
            const mine = m.sender.id === myUserId;
            return (
              <div key={m.id} className={`game-chat-line${mine ? " is-mine" : ""}`}>
                <span className="game-chat-nick">{mine ? "אתם" : m.sender.nickname}</span>
                <span className="game-chat-body">{m.body}</span>
                <time className="game-chat-time" dateTime={m.createdAt}>
                  {formatTime(m.createdAt)}
                </time>
              </div>
            );
          })}
        </div>

        <form className="game-chat-composer" onSubmit={onSubmit}>
          {readOnly ? (
            <p className="game-chat-readonly">לא ניתן לשלוח לאחר סיום המשחק</p>
          ) : (
            <>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={2000}
                placeholder="הודעה…"
                aria-label="הודעה בצ'אט המשחק"
                disabled={sending}
                dir="rtl"
                autoComplete="off"
              />
              <button type="submit" className="game-chat-send" disabled={sending || !draft.trim()}>
                שליחה
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
