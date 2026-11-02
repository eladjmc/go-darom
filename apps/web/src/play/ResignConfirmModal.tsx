import type { RefObject } from "react";
import { PlayModalShell } from "./PlayModalShell";

type Props = {
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Polished surrender confirmation — centered dialog, not an inline menu card.
 */
export function ResignConfirmModal({ busy = false, onCancel, onConfirm, returnFocusRef }: Props) {
  return (
    <PlayModalShell
      title="כניעה מהמשחק"
      onClose={onCancel}
      closeDisabled={busy}
      returnFocusRef={returnFocusRef}
      cardClassName="play-modal-card-compact play-resign-modal"
      testId="resign-confirm-modal"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            data-autofocus
            disabled={busy}
            onClick={onCancel}
          >
            ביטול
          </button>
          <button
            type="button"
            className="btn play-btn-danger"
            disabled={busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy ? "נכנעים…" : "כן, להיכנע"}
          </button>
        </>
      }
    >
      <p className="play-resign-lede">
        האם אתם בטוחים שברצונכם להיכנע?
        <br />
        המשחק יסתיים מייד והיריב ינצח.
      </p>
    </PlayModalShell>
  );
}
