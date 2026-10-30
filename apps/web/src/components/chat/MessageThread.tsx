import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { ChatMessageDto } from "@go-darom/shared";
import { ChatBubble } from "./ChatBubble";
import { isNearBottom, planMessageScroll, restoreScrollAfterPrepend, scrollToBottom } from "./chatScroll";

export function MessageThread({
  messages,
  myUserId,
  loading,
  emptyLabel,
  error,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onReport,
  threadKey,
}: {
  messages: ChatMessageDto[];
  myUserId: string;
  loading?: boolean;
  emptyLabel: string;
  error?: string | null;
  hasOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onReport?: (message: ChatMessageDto) => void;
  /** Reset scroll bookkeeping when switching conversations. */
  threadKey?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const prevLen = useRef(0);
  const prevFirstId = useRef<string | null>(null);
  /** Height after the last settled scroll plan — used to restore after prepend. */
  const settledScrollHeight = useRef(0);
  const activeThread = useRef(threadKey);

  if (activeThread.current !== threadKey) {
    activeThread.current = threadKey;
    prevLen.current = 0;
    prevFirstId.current = null;
    stickBottom.current = true;
    settledScrollHeight.current = 0;
  }

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      stickBottom.current = isNearBottom(el);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threadKey]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const nextFirstId = messages[0]?.id ?? null;
    const plan = planMessageScroll({
      prevLength: prevLen.current,
      nextLength: messages.length,
      prevFirstId: prevFirstId.current,
      nextFirstId,
      stickBottom: stickBottom.current,
      loadingOlder: Boolean(loadingOlder),
      previousScrollHeight: settledScrollHeight.current,
    });

    if (plan.action === "bottom") {
      scrollToBottom(el);
      stickBottom.current = true;
    } else if (plan.action === "restore-prepend") {
      restoreScrollAfterPrepend(el, plan.previousScrollHeight);
    }

    prevLen.current = messages.length;
    prevFirstId.current = nextFirstId;
    settledScrollHeight.current = el.scrollHeight;
  }, [messages, loadingOlder, threadKey]);

  const showInitialLoading = Boolean(loading) && messages.length === 0 && !error;

  let body: ReactNode;
  if (showInitialLoading) {
    body = <p className="msg-status">טוענים הודעות…</p>;
  } else if (error && messages.length === 0) {
    body = (
      <p className="msg-status" role="alert">
        {error}
      </p>
    );
  } else if (messages.length === 0) {
    body = <p className="msg-empty">{emptyLabel}</p>;
  } else {
    body = (
      <>
        {hasOlder && (
          <button
            type="button"
            className="btn btn-secondary msg-load-older"
            disabled={loadingOlder}
            onClick={onLoadOlder}
          >
            {loadingOlder ? "טוענים…" : "הודעות קודמות"}
          </button>
        )}
        {messages.map((m, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const stacked = Boolean(prev && prev.sender.id === m.sender.id && !prev.deletedAt && !m.deletedAt);
          return (
            <ChatBubble
              key={m.id}
              message={m}
              mine={m.sender.id === myUserId}
              stacked={stacked}
              onReport={
                m.sender.id !== myUserId && !m.deletedAt && onReport ? () => onReport(m) : undefined
              }
            />
          );
        })}
      </>
    );
  }

  return (
    <div className="msg-thread" ref={scrollerRef} role="log" aria-live="polite" aria-relevant="additions">
      {body}
    </div>
  );
}
