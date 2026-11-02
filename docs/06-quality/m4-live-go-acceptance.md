# M4 Live Go — Manual Acceptance Checklist

**Status:** APPROVED checklist — fill after implementation; M4 not complete until owner sign-off  
**Environment:** two browsers / members A & B; local API+web; migration `0003_m4_live_go`

## Setup

- [ ] A and B onboarded; optional C for 403  
- [x] Board render smoke PASS — **SnapshotBoard production** (Goban paint failure; see `M4_GOBAN_RENDER_FAILURE.md`); `node scripts/m4-board-render-smoke.mjs`  

## Game hub UX

- [ ] `/play` compact dashboard: title **משחקים**, CTA **משחק חדש**, המשחק שלי, invites tabs  
- [ ] Opponent picker: nickname search, avatar, online status; no self-invite  
- [ ] Settings modal: 9/13/19, clock, colors, komi, handicap limits  
- [ ] Recipient sees settings; accept / reject / cancel with Hebrew feedback  
- [ ] Active game card + **חזרה למשחק**; second Live invite blocked while active  
- [ ] Empty / loading / error states usable on desktop + mobile  
- [ ] DM header **הזמנה למשחק** opens settings with peer locked; send stays in DM; recipient gets invite notification  
- [ ] DM invite respects online / busy / block / suspend (server AuthZ) 

## Invitations

- [ ] Default invite 9×9 / no clock / random / komi 6.5 — bell + toast  
- [ ] Explicit inviter Black/White works; handicap → Black stones, White to move; komi editable; limits enforced  
- [ ] Reject / expire (+5m) / re-invite  
- [ ] Concurrent accept cannot create two games  
- [ ] Occupancy blocks second Live; sibling invites cleared  
- [ ] Blocked / suspended cannot invite/accept  
- [ ] Inviter offline beyond grace → accept fails clearly  
- [ ] Explicit logout cancels pending outgoing Live invites  
- [ ] Tab close / transient disconnect does **not** cancel within 10s grace  

## Play & sync

- [ ] Exactly **one** board visible (`SnapshotBoard` + `BoardViewport`; never broken Goban)  
- [ ] Board-first OGS-inspired room; large **square** board; grid/stones visible; no renderer debug toggle  
- [ ] Mobile: square fit at 320–430; pinch zoom/pan + reset; 19×19 preview-then-confirm  
- [ ] Compact player rows: avatar, color, turn, captures, clock only when enabled, presence  
- [ ] Compact controls: Pass primary; Undo / **צ'אט המשחק** / More (no-winner, resign+confirm)  
- [ ] Undo: only last-mover may request; opponent accept/reject; never undo opponent's move  
- [ ] Illegal moves → Hebrew toast (no raw engine text); deduped; no persistent red banner for routine illegals  
- [ ] Dedicated game chat (**צ'אט המשחק**) — not community DM; playable with chat closed  
- [ ] Chat is **always visible** under controls (no open/collapse controls); place stones while chatting; no backdrop  
- [ ] Board does not remount when sending chat; no socket reconnect from chat UI  
- [ ] Two games A/B: messages isolated per `gameId`; community DMs unchanged; DM unread unaffected  
- [ ] Refresh/reconnect restores game-chat history without duplicates  
- [ ] Non-participant denied history + `game-chat:join`  
- [ ] Finished game: history readable, send disabled; not merged into DMs  
- [ ] Desktop: always-visible chat under controls in left sidebar (not under board)  
- [ ] Mobile: always-visible chat under controls; board primary; zoom/pan still works  
- [ ] Scoring / proposals / result states clear  
- [ ] Mobile: players → board → actions; 360/390/430 usable; no control overflow  
- [ ] Legal/illegal moves; pass; resign; mutual own-move undo; versioned commands  
- [ ] Refresh / reconnect / multi-tab keep committed state; no remount-per-socket-flicker  
- [ ] **חזרה למשחק** when active Live exists  
- [ ] Screenshots under `docs/07-delivery/visual-qa/m4-game-room-*` and `m4-game-controls-*`  

## Scoring / clock / idle

- [ ] Two passes → scoring phase with provisional Japanese breakdown + territory markers  
- [ ] Mark/unmark dead; both players confirm same set; dispute resumes play  
- [ ] Finished score shows winner, margin, territory, captures, komi, totals (from committed result)  
- [ ] Resign / timeout / no-winner: no fabricated point margin  
- [ ] Refresh preserves finished score details for both participants  
- [ ] Mutual no-winner mid-game  
- [ ] 15m clock: continues on disconnect; timeout loss when expired  
- [ ] After 48h untimed idle: mutual no-winner only; **no** unilateral end; **no** convert-to-async control  

## Invitation notification UX

- [ ] Desktop bell opens popover (~400px) over current page — **no** full-page navigation  
- [ ] Mobile bell opens right-side drawer (RTL, backdrop, scroll lock, Escape)  
- [ ] Messages icon stays separate from the bell  
- [ ] Compact rows: icon, short Hebrew copy, relative time, unread dot, dismiss  
- [ ] `game.invite` expands in-place for settings + accept/reject (not permanently expanded)  
- [ ] Accept → authoritative API → `/play/:gameId`; reject notifies inviter; no double-submit  
- [ ] Dismiss hides notification for current user only; invite remains on Games hub until resolved  
- [ ] Dismissed stays hidden after refresh / across tabs; unread badge accurate  
- [ ] Expired / cancelled / accepted / rejected invites non-actionable in expand panel  
- [ ] Toast opens overlay (deduped); `/notifications` deep-link redirects and opens overlay  
- [ ] Screenshots under `docs/07-delivery/visual-qa/m4-invite-notification-*`  

## Notify / privacy

- [ ] Subtle turn notice when online outside room; no duplicate per turn; none while in room  
- [ ] Private replay for participants; stranger 403  
- [ ] Hub **משחקים קודמים** lists finished games for both participants (opponent, size, date, result, צפייה במשחק)  
- [ ] Cursor pagination loads older finished games without hard 50-only cut  
- [ ] Opening from history stays in read-only replay (First/Prev/Next/Last); refresh preserves access  
- [ ] Replay reconstruction matches authoritative final board (undo / handicap / passes / captures)  
- [ ] Finished games reject further gameplay commands (410)  
- [ ] No-winner / undo: initiator sees waiting (+ withdraw); only opponent Accept/Reject; self-respond rejected by API (`NO_WINNER_SELF` / `UNDO_SELF`)  
- [ ] M3 chat/DMs still work  

## Sign-off

| Role | Date | Result |
|---|---|---|
| Owner | | Pass / Fail — **required before M4 complete / M5** |
