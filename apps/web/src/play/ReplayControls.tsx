import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  plyIndex: number;
  plyCount: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
};

/**
 * Conventional media-player scrubber (always LTR): « ‹ › »
 * First / Prev / Next / Last — icons are not RTL-mirrored.
 */
export function ReplayControls({ plyIndex, plyCount, onFirst, onPrev, onNext, onLast }: Props) {
  const atStart = plyIndex <= 0;
  const atEnd = plyIndex >= plyCount;
  return (
    <div className="game-replay-controls" data-testid="game-replay-controls" role="group" aria-label="ניווט מהלכים">
      <div className="game-replay-actions" dir="ltr">
        <button
          type="button"
          className="game-replay-btn"
          disabled={atStart}
          onClick={onFirst}
          title="להתחלה"
          aria-label="להתחלה"
        >
          <ChevronsLeft className="game-replay-icon" size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="game-replay-btn"
          disabled={atStart}
          onClick={onPrev}
          title="מהלך קודם"
          aria-label="מהלך קודם"
        >
          <ChevronLeft className="game-replay-icon" size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="game-replay-btn"
          disabled={atEnd}
          onClick={onNext}
          title="מהלך הבא"
          aria-label="מהלך הבא"
        >
          <ChevronRight className="game-replay-icon" size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="game-replay-btn"
          disabled={atEnd}
          onClick={onLast}
          title="לסיום"
          aria-label="לסיום"
        >
          <ChevronsRight className="game-replay-icon" size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      <p className="game-replay-progress" aria-live="polite">
        מהלך {plyIndex} מתוך {plyCount}
      </p>
    </div>
  );
}
