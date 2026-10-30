import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  disabled,
  sending,
  placeholder,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  sending?: boolean;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasSending = useRef(false);

  useEffect(() => {
    if (wasSending.current && !sending) {
      textareaRef.current?.focus();
    }
    wasSending.current = Boolean(sending);
  }, [sending]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || disabled || sending) return;
    try {
      await onSend(text);
      onDraftChange("");
    } catch {
      // Keep draft + focus on failure (parent should throw).
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form className="msg-composer" onSubmit={(e) => void submit(e)}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={2000}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled || sending}
        dir="rtl"
      />
      <button className="msg-send" type="submit" disabled={disabled || sending || !draft.trim()} aria-busy={sending}>
        {sending ? "…" : "שליחה"}
      </button>
    </form>
  );
}
