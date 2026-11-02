import { useState } from "react";
import type { BoardSnapshot } from "@go-darom/go-engine";
import { Flag, MoreHorizontal, Undo2 } from "lucide-react";
import { BoardViewport } from "../play/BoardViewport";
import { ReplayControls } from "../play/ReplayControls";
import { ResignConfirmModal } from "../play/ResignConfirmModal";
import { SnapshotBoard } from "../play/SnapshotBoard";
import "../styles/global.css";
import "../play/play.css";

/**
 * Visual fixture: /dev/game-room-smoke?size=9|13|19&scene=controls|coords|undo|toast|dm|scoring|result|resign|resign-busy|replay
 * Chat is always visible under controls (scene=dm keeps sample messages).
 */
function makeSnapshot(size: 9 | 13 | 19): BoardSnapshot {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  grid[2]![2] = 1;
  grid[2]![3] = 2;
  grid[3]![3] = 1;
  const mid = Math.floor(size / 2);
  grid[mid]![mid] = 2;
  return {
    size,
    grid,
    toMove: "black",
    phase: "play",
    moveNumber: 4,
    blackPrisoners: 1,
    whitePrisoners: 0,
    komi: 6.5,
    handicap: 0,
    positionId: `smoke-${size}`,
  };
}

function makeOwnership(size: number): number[][] {
  const o = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x + y < 3) o[y]![x] = 1;
      else if (x + y > size * 2 - 5) o[y]![x] = 2;
    }
  }
  return o;
}

function parseSize(): 9 | 13 | 19 {
  const q = new URLSearchParams(window.location.search).get("size");
  if (q === "9" || q === "19") return Number(q) as 9 | 19;
  return 13;
}

function parseScene():
  | "controls"
  | "coords"
  | "undo"
  | "toast"
  | "dm"
  | "scoring"
  | "result"
  | "resign"
  | "resign-busy"
  | "replay" {
  const q = new URLSearchParams(window.location.search).get("scene");
  if (
    q === "coords" ||
    q === "undo" ||
    q === "toast" ||
    q === "dm" ||
    q === "scoring" ||
    q === "result" ||
    q === "resign" ||
    q === "resign-busy" ||
    q === "replay"
  ) {
    return q;
  }
  return "controls";
}

function SmokeChat() {
  return (
    <div id="game-chat-panel" className="game-chat-dock" data-testid="game-chat-panel">
      <header className="game-chat-dock-header">
        <strong>צ&apos;אט המשחק</strong>
      </header>
      <div className="game-chat-dock-body">
        <div className="game-chat-log" data-testid="game-chat-log">
          <div className="game-chat-line">
            <span className="game-chat-nick">אלעד</span>
            <span className="game-chat-body">משחק יפה!</span>
            <time className="game-chat-time">14:02</time>
          </div>
          <div className="game-chat-line is-mine">
            <span className="game-chat-nick">אתם</span>
            <span className="game-chat-body">תודה, בהצלחה</span>
            <time className="game-chat-time">14:03</time>
          </div>
          <div className="game-chat-line">
            <span className="game-chat-nick">אלעד</span>
            <span className="game-chat-body">מהלך מעניין במרכז</span>
            <time className="game-chat-time">14:05</time>
          </div>
        </div>
        <form className="game-chat-composer">
          <input type="text" placeholder="הודעה…" readOnly defaultValue="" />
          <button type="button" className="game-chat-send">
            שליחה
          </button>
        </form>
      </div>
    </div>
  );
}

export function GameRoomSmoke() {
  const size = parseSize();
  const scene = parseScene();
  const snapshot = makeSnapshot(size);
  const [moreOpen, setMoreOpen] = useState(scene === "controls");
  const ownership = scene === "scoring" || scene === "result" ? makeOwnership(size) : null;
  const dead = scene === "scoring" || scene === "result" ? new Set(["2,2"]) : undefined;

  return (
    <div className="game-room" data-testid="game-room-smoke" dir="rtl" lang="he">
      <div className="game-room-bar">
        <span className="game-room-back">← למשחקים</span>
        <span className="game-room-meta">
          {size}×{size} · ללא שעון · קומי 6.5
        </span>
      </div>
      <div className="game-room-layout">
        <div className="game-room-board-wrap">
          <div className="game-board-stage" data-testid="board-stage">
            <BoardViewport>
              <SnapshotBoard
                snapshot={snapshot}
                interactive
                lastMove={scene === "scoring" ? null : { x: Math.floor(size / 2), y: Math.floor(size / 2) }}
                deadMarks={dead}
                ownership={ownership}
                hoverColor="black"
              />
            </BoardViewport>
          </div>
        </div>
        <aside className="game-room-panel" data-testid="game-controls">
          <div className="game-players game-players-compact" role="list">
            <div className="game-player-row is-turn" role="listitem">
              <span className="game-stone game-stone-black" />
              <span className="game-player-avatar-sm">מ</span>
              <div className="game-player-row-copy">
                <strong>מישה · אתם</strong>
                <span>מחובר/ת · נלקחו 1 · התור</span>
              </div>
            </div>
            <div className="game-player-row" role="listitem">
              <span className="game-stone game-stone-white" />
              <span className="game-player-avatar-sm">א</span>
              <div className="game-player-row-copy">
                <strong>אלעד</strong>
                <span>מחובר/ת · נלקחו 0</span>
              </div>
            </div>
          </div>

          {scene === "scoring" ? (
            <div className="game-phase-banner game-scoring-banner" data-testid="scoring-phase">
              <strong>שלב סימון וניקוד</strong>
              <p>לחצו על אבנים לסימון/ביטול מתות.</p>
            </div>
          ) : null}

          {scene === "result" || scene === "replay" ? (
            <div className="game-phase-banner game-result-card" data-testid="game-result">
              <strong>
                {scene === "replay" ? "המשחק הסתיים בהסכמה, ללא מנצח" : "הלבן ניצח ב־3.5 נקודות"}
              </strong>
              {scene === "replay" ? <p className="game-replay-mode-label">צפייה במשחק · קריאה בלבד</p> : null}
            </div>
          ) : null}

          {scene === "replay" ? (
            <ReplayControls
              plyIndex={2}
              plyCount={4}
              onFirst={() => undefined}
              onPrev={() => undefined}
              onNext={() => undefined}
              onLast={() => undefined}
            />
          ) : null}

          {scene === "undo" ? (
            <div className="game-proposal is-enter" data-testid="undo-proposal">
              <p>אלעד מבקש/ת לבטל: אבן ב־4,4</p>
              <div className="game-proposal-actions">
                <button type="button" className="btn btn-primary btn-compact">
                  אישור ביטול
                </button>
                <button type="button" className="btn btn-secondary btn-compact">
                  דחייה
                </button>
              </div>
            </div>
          ) : null}

          {scene !== "result" && scene !== "scoring" && scene !== "replay" ? (
            <div className="game-toolbar">
              <button type="button" className="btn btn-primary game-action-pass">
                ויתור על התור
              </button>
              <div className="game-toolbar-secondary">
                <button type="button" className="game-tool-btn" disabled>
                  <Undo2 size={16} />
                  <span>ביטול מהלך</span>
                </button>
                <div className="game-more">
                  <button type="button" className="game-tool-btn" onClick={() => setMoreOpen((v) => !v)}>
                    <MoreHorizontal size={16} />
                    <span>עוד</span>
                  </button>
                  {moreOpen ? (
                    <div className="game-more-menu is-open">
                      <button type="button">סיום ללא מנצח</button>
                      <button type="button" className="is-danger">
                        <Flag size={14} /> כניעה
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {scene === "scoring" ? (
            <div className="game-toolbar">
              <button type="button" className="btn btn-primary game-action-pass">
                אישור תוצאה
              </button>
            </div>
          ) : null}

          <SmokeChat />
        </aside>
      </div>

      {scene === "toast" ? (
        <div className="toast-host" aria-live="polite" data-testid="game-error-toast">
          <div className="toast-card">
            <strong>משחק</strong>
            <p>המקום הזה כבר תפוס</p>
          </div>
        </div>
      ) : null}

      {scene === "resign" || scene === "resign-busy" ? (
        <ResignConfirmModal
          busy={scene === "resign-busy"}
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />
      ) : null}
    </div>
  );
}
