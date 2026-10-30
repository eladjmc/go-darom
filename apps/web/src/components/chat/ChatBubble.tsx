import type { ChatMessageDto } from "@go-darom/shared";

export function ChatBubble({
  message,
  mine,
  stacked,
  onReport,
}: {
  message: ChatMessageDto;
  mine: boolean;
  /** Same sender as previous bubble — tighter spacing / hide repeated chrome */
  stacked?: boolean;
  onReport?: () => void;
}) {
  const initial = (message.sender.nickname || "?").slice(0, 1);
  const time = new Date(message.createdAt).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`chat-bubble-row${mine ? " is-mine" : " is-theirs"}${stacked ? " is-stacked" : ""}`}
      data-mine={mine ? "1" : "0"}
    >
      {!mine &&
        (stacked ? (
          <span className="chat-avatar is-spacer" aria-hidden="true" />
        ) : message.sender.avatarUrl ? (
          <img className="chat-avatar" src={message.sender.avatarUrl} alt="" width={36} height={36} />
        ) : (
          <span className="chat-avatar is-fallback" aria-hidden="true">
            {initial}
          </span>
        ))}
      <div className={`chat-bubble${mine ? " is-mine" : " is-theirs"}`} dir="rtl">
        {!mine && !stacked && <div className="chat-bubble-name">{message.sender.nickname}</div>}
        <div className="chat-bubble-body">
          {message.deletedAt ? <em className="chat-deleted">ההודעה הוסרה</em> : message.body}
        </div>
        <div className="chat-bubble-meta">
          <time dateTime={message.createdAt}>{time}</time>
          {!mine && !message.deletedAt && onReport && (
            <button type="button" className="chat-report" onClick={onReport}>
              דיווח
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
