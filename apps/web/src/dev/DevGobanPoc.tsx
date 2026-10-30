import { useMemo, useState } from "react";
import {
  createGobanEngineAdapter,
  type BoardSnapshot,
  type EngineGame,
} from "@go-darom/go-engine";
import { hoverPreviewClass } from "./hover-preview";
import "./dev-goban-poc.css";

const SIZE = 9;
const CELL = 40;
const PAD = 28;
const BOARD_PX = PAD * 2 + CELL * (SIZE - 1);

function createFreshGame(): { adapter: ReturnType<typeof createGobanEngineAdapter>; game: EngineGame } {
  const adapter = createGobanEngineAdapter();
  const game = adapter.createGame({ size: SIZE, komi: 6.5 });
  return { adapter, game };
}

export function DevGobanPoc() {
  const [{ adapter, game }, setSession] = useState(createFreshGame);
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(() => adapter.snapshot(game));
  const [message, setMessage] = useState<string>("לחצו על צומת כדי לשחק אבן.");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");

  const refresh = (nextGame: EngineGame = game) => {
    setSnapshot(adapter.snapshot(nextGame));
  };

  const onIntersectionClick = (x: number, y: number) => {
    const result = adapter.play(game, { x, y });
    if (!result.ok) {
      setMessageTone("error");
      setMessage(`מהלך לא חוקי (${result.code}): ${result.message}`);
      return;
    }
    setMessageTone("info");
    setMessage(`שיחקתם ב־(${x + 1},${y + 1}).`);
    refresh();
  };

  const onPass = () => {
    const result = adapter.pass(game);
    if (!result.ok) {
      setMessageTone("error");
      setMessage(`ויתור תור נכשל: ${result.message}`);
      return;
    }
    setMessageTone("info");
    setMessage("ויתור תור.");
    refresh();
  };

  const onUndo = () => {
    const result = adapter.undo(game);
    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.message);
      return;
    }
    setMessageTone("info");
    setMessage("בוטל המהלך האחרון.");
    refresh();
  };

  const onReset = () => {
    const next = createFreshGame();
    setSession(next);
    setSnapshot(next.adapter.snapshot(next.game));
    setMessageTone("info");
    setMessage("לוח חדש (9×9, קומי 6.5).");
  };

  const toMoveLabel = snapshot.toMove === "black" ? "שחור" : "לבן";

  const stars = useMemo(() => {
    // 9×9 hoshi: (2,2), (2,6), (6,2), (6,6), (4,4)
    return [
      [2, 2],
      [2, 6],
      [6, 2],
      [6, 6],
      [4, 4],
    ] as const;
  }, []);

  return (
    <main className="poc-shell" dir="rtl" lang="he">
      <header className="poc-header">
        <p className="poc-badge">זמני · למפתחים בלבד · M1</p>
        <h1>דמו מנוע גו — 9×9</h1>
        <p className="poc-lede">
          מופעל דרך <code>GoEnginePort</code> / <code>GobanEngineAdapter</code> בלבד. לא חלק מממשק המוצר.
        </p>
        <p>
          <a href="/">← חזרה לסטטוס M1</a>
        </p>
      </header>

      <section className="poc-status" aria-live="polite">
        <ul>
          <li>תור: {toMoveLabel}</li>
          <li>מהלך #{snapshot.moveNumber}</li>
          <li>שבויים שחור: {snapshot.blackPrisoners}</li>
          <li>שבויים לבן: {snapshot.whitePrisoners}</li>
          <li>קומי: {snapshot.komi}</li>
        </ul>
        <p className={messageTone === "error" ? "poc-msg error" : "poc-msg"}>{message}</p>
      </section>

      <div className="poc-actions">
        <button type="button" onClick={onPass}>
          ויתור תור (Pass)
        </button>
        <button type="button" onClick={onUndo}>
          ביטול מהלך
        </button>
        <button type="button" onClick={onReset}>
          איפוס לוח
        </button>
      </div>

      <div className="poc-board-wrap">
        <svg
          className={`poc-board ${hoverPreviewClass(snapshot.toMove)}`}
          width={BOARD_PX}
          height={BOARD_PX}
          viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
          role="img"
          aria-label="לוח גו 9 על 9 לבדיקת מנוע"
          data-to-move={snapshot.toMove}
        >
          <rect x={0} y={0} width={BOARD_PX} height={BOARD_PX} className="poc-wood" />
          {Array.from({ length: SIZE }, (_, i) => (
            <g key={`line-${i}`}>
              <line
                x1={PAD}
                y1={PAD + i * CELL}
                x2={PAD + (SIZE - 1) * CELL}
                y2={PAD + i * CELL}
                className="poc-line"
              />
              <line
                x1={PAD + i * CELL}
                y1={PAD}
                x2={PAD + i * CELL}
                y2={PAD + (SIZE - 1) * CELL}
                className="poc-line"
              />
            </g>
          ))}
          {stars.map(([x, y]) => (
            <circle
              key={`star-${x}-${y}`}
              cx={PAD + x * CELL}
              cy={PAD + y * CELL}
              r={3}
              className="poc-star"
            />
          ))}
          {snapshot.grid.map((row, y) =>
            row.map((cell, x) => {
              if (cell === 0) return null;
              return (
                <circle
                  key={`stone-${x}-${y}`}
                  cx={PAD + x * CELL}
                  cy={PAD + y * CELL}
                  r={CELL * 0.42}
                  className={cell === 1 ? "poc-black" : "poc-white"}
                />
              );
            }),
          )}
          {Array.from({ length: SIZE }, (_, y) =>
            Array.from({ length: SIZE }, (_, x) => {
              if (snapshot.grid[y][x] !== 0) return null;
              return (
                <circle
                  key={`hit-${x}-${y}`}
                  cx={PAD + x * CELL}
                  cy={PAD + y * CELL}
                  r={CELL * 0.45}
                  className="poc-hit"
                  onClick={() => onIntersectionClick(x, y)}
                >
                  <title>{`(${x + 1},${y + 1})`}</title>
                </circle>
              );
            }),
          )}
        </svg>
      </div>

      <ol className="poc-howto">
        <li>לחצו על צומת ריק כדי להניח אבן (המנוע מאמת חוקיות).</li>
        <li>
          לכידה בפינה (מספרי רשת 1-based על המסך): שחור (2,1) → לבן (1,1) → שחור (1,2) — האבן הלבנה נעלמת ושבויי
          שחור עולים ב־1.
        </li>
        <li>לחצו «ויתור תור» פעמיים; «ביטול מהלך» מחזיר מצב קודם.</li>
        <li>מהלך על משבצת תפוסה / התאבדות / קו אמור להציג שגיאה ולא לשנות את הלוח.</li>
      </ol>
    </main>
  );
}
