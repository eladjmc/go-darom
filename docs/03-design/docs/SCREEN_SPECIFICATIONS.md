# Screen Specifications — MVP Inventory

**Status:** DRAFT. Hebrew strings are UI copy proposals; final copy requires approval. Each screen must inherit shared Loading, Empty, Error, Offline, Unauthorized and Focus states where applicable.

## Screen inventory and ownership
| ID | Page / view | Audience | Key content and CTA | Major interaction / UX constraint |
|---|---|---|---|---|
| UX-001 | Home | Everyone | Hero, next event, weekly puzzle, community news, learn, photos; join/play CTAs | No account required to browse. Existing members can return to active Live game. |
| UX-002 | First-login onboarding | New member | Google photo, nickname editor, confirm | Minimal steps; return to original intent; validate nickname. |
| UX-003 | Community announcements | Everyone | Published posts, pinned item, category filters | No comments. Admin authored only. |
| UX-004 | Announcement detail | Everyone | Rich content, hero image, optional link | Accessible headings and media; no phantom comments. |
| UX-005 | Events list | Everyone | Upcoming events, venue, date, capacity | Status and availability visibly differentiated. |
| UX-006 | Event detail + registration | Everyone | Detail, location, confirmed count, capacity, registration | No public registrant names. Member one-click; guest short form; pending 15-min seat hold and email verification. |
| UX-007 | Guest verification result | Guest | Confirmed/expired/already-used link | Expired token offers safe retry; capacity can change. |
| UX-008 | Member directory | Member | Search nickname, avatar, online presence | Contact invite and DM; privacy no email; empty results state. |
| UX-009 | Member profile | Member | Nickname/avatar, DM, invite to game/Study | Show block/report action; no ranks, stats or bio. |
| UX-010 | Community chat | Member | One central text channel, message history | Scroll retention, unread indicators, block/report, no noisy public-message toast. |
| UX-011 | Direct messages | Member | 1:1 history, composer, unread states | Report selected message; block prevents direct sending. |
| UX-012 | Notification bell/list | Member | Persisted invite, DM, async-turn and account alerts | Real-time toast for important events; read/unread, deep link. |
| UX-013 | Invite to game dialog | Member | Mode Live/Async, opponent, board size, time, komi, colors, handicap | Live default 9×9 + no clock; show all settings before send; cannot invite blocked users. |
| UX-014 | Incoming game invite | Member | Sender, settings, countdown, accept/decline | Live 5-min expiry, inviter presence conditions; expiration explains resending. Async invitation 3 days. |
| UX-015 | Live game room | 2 players | Largest practical goban, player info, optional timer, action bar, move history, match chat if in approved scope | OGS-like layout; board and essential actions always accessible on mobile; server-authoritative ack. |
| UX-016 | Scoring and game result | 2 players | Mark dead stones, score preview, accept, dispute/resume, end no winner | Never show final score as approved until both agree; explicit state transitions. |
| UX-017 | Async game room | 2 players | Board, current turn, per-turn deadline, pass/resign, history | Show 'תורך' / 'ממתינים ליריב'; can leave/re-enter. |
| UX-018 | Saved game replay | Participants | Board + move stepping controls, final result | No ratings/leaderboards; readonly, accessible move navigation. |
| UX-019 | Personal Study Board | Member | Free edit board, stone palette, remove, undo/redo, save | No legality enforcement, move sequence independent from live game. |
| UX-020 | Shared Study Board | Max 2 members | Collaborative board, presence, global undo/redo, share/invite | Both can edit, owner delete for all, partner hide locally; reconnection reload. |
| UX-021 | My area | Member | Active live, async turns, saved Study, events, replay, account settings | One-click resume live, focused actionable statuses. |
| UX-022 | Learning library | Everyone | Guides/videos, topic and difficulty filters | No structured course pathway or progress tracking. |
| UX-023 | Guide / lecture | Everyone | Tiptap content, embedded video, interactive Go demonstrations | Board playback/sandbox exact controls remain open; no required login. |
| UX-024 | Puzzle library | Everyone | Featured weekly puzzle, browse by topic/difficulty | No personal solve history. |
| UX-025 | Puzzle solve | Everyone | Interactive board, player turn, hint, correctness, explanation, retry | Branching SGF solutions; board POC dependency. |
| UX-026 | Gallery / event gallery | Everyone | Admin-published photo grid and lightbox | Photo consent and accessible captions; no member upload. |
| UX-027 | Shop placeholder | Everyone | Branded Coming Soon display | No product catalog/checkout/payment. |
| UX-028 | Admin dashboard | Admin | Short operational overview, links to work areas | Not a competitive analytics dashboard; no invented data. |
| UX-029 | Admin content editor | Admin | Announcements/guides, Tiptap, images, draft/publish | Preview and safe unsaved changes flow. |
| UX-030 | Admin events | Admin | Event CRUD, registrations, cap, manual add, export CSV, galleries | No registration identity visible publicly. |
| UX-031 | Admin puzzles | Admin | Board editor, SGF upload, branch tree, validity preview, weekly selection | Input validation; preview before publish. |
| UX-032 | Admin moderation | Admin | Reports, bounded DM context, action log, suspensions | No browse-all-DMs capability. |
| UX-033 | Account & privacy | Member | Nickname/avatar, blocks, delete account | Deletion explains shared content anonymization; require explicit confirmation. |

## High fidelity priority: Home (UX-001)
- Hero is photo-driven yet visually light; heading likely "לומדים. משחקים. נפגשים." and two CTAs: "לגלות את גו" and "למפגשים הקרובים". Exact copy pending.
- Below fold: featured upcoming event with real metadata; clickable weekly puzzle preview; three/four editorial cards to learn / play / join community; community post feed excerpt; gallery photos; shop Coming Soon lower prominence.
- Logged-in user can see active game return CTA without replacing the community focus.
- No fabricated numbers, community quotes, events or fake member testimonials in production.

## High fidelity priority: Game room (UX-015/016/017)
- Desktop layout: goban takes main region; side panel shows current player, captured counts, clock (when enabled), move list and optional contextual chat; action bar adjacent to board.
- Mobile: board fills width while maintaining proper square aspect; control area directly beneath/adjacent; collapsible tabs for move history/chat; never require excessive scrolling to access Pass/Undo/Resign.
- Board renderer is functional: coordinate labels optional; hover candidate stone on pointer devices; safe touch placement UX to be validated for 19×19, preferably preview/tap-confirm or zoom assist if needed.
- Valid move feedback: transient pending marker until server acknowledgement; on rejection restore authoritative board with accessible reason.
- Keep resign away from routine actions and require confirmation; undo request visible to opponent; game no-winner proposal can be made at any phase and must be accepted by both.
- Two consecutive passes open scoring; dead stones provisional until both accept; disagreement allows resume play. Result with replay link on completion.
- Rejoin after refresh/restart shows 'מתחברים מחדש' and requests latest snapshot; a timeout of local UI must not independently adjudicate winner.
- Game-room chat was suggested earlier but its exact scope is not explicitly guaranteed by PRD. **Treat as proposal** until owner agrees; do not silently add separate chat persistence.

## High fidelity priority: Events (UX-005/006/007)
- Show venue, date/time, accessible map link where appropriate, event description, confirmed count, availability and state (open/full/cancelled/past).
- Guest form: name and email required; phone/Go experience optional. Show privacy text and 15-minute verification clock for capped events.
- On submit show 'בדקו את המייל כדי לאשר את ההרשמה', not 'נרשמת בהצלחה' until verified; if no email deliverability present retry safely.
- For full event, do not offer waitlist; do not expose participant names.

## High fidelity priority: Chat / Notifications (UX-010/011/012)
- Desktop may show central chat as main area and DMs as distinct view; mobile maximizes readable message list and composer.
- Message group displays sender avatar/nickname and time; unread count distinguishes DMs vs community; strong keyboard/focus semantics.
- Invitation toast should remain actionable and not disappear before user can perceive it; bell persists invitation record even when toast closed.
- Blocking prevents new direct communication; preserve understandable neutral failure text without unnecessarily exposing blocker identity.

## Admin productivity design
- Dedicated admin sidebar with Events, Announcements, Guides, Puzzles, Gallery, Users/Reports; responsive narrow mode.
- Content editor should support save draft, preview, publish, undo accidental changes and unsaved-changes prompt.
- Dangerous actions confirm scope ('מחיקה עבור כולם' vs 'הסר מהרשימה שלי').
- CSV exports have clear security warning and only authorized download paths.

## Generic error patterns
- Offline: 'החיבור נותק. מנסים להתחבר מחדש.' + status; do not claim accepted move until ACK.
- Empty states: 'אין כרגע אירועים קרובים' / 'לא נמצאו חברים' with contextual next step.
- Forbidden: nontechnical denial and safe back navigation.
- Expired invite: 'ההזמנה כבר לא זמינה' + 'שליחת הזמנה חדשה'.
- Suspended account: limited functionality with explanatory message and appropriate contact path (details to define in LLD).

## Asset binding addendum — v0.2 (normative mapping, conditional on QA)
- HOME hero: `HR-001-DESKTOP`, `HR-001-MOBILE`; source original `HR-001-SOURCE`. Render overlaid text/CTAs as DOM. Reconcile RTL left-negative-space composition in actual layout.
- Public/inner header: `BR-LOCKUP-REF` is a temporary raster reference; do not ship it as final production wordmark. Use an accessible text brand until validated vector logo ships.
- Games: `IC-PLAY-GO` supplemental; only Goban renderer for functional board.
- Study: `IC-STUDY-BOARD`; puzzles: `IC-PUZZLE`.
- Empty: `ES-NO-GAMES`, `ES-NO-EVENTS`, `ES-NO-MESSAGES`, `ES-NO-PUZZLES`, `ES-NO-RESULTS`, `ES-SHOP-COMING-SOON`.
- Decorative: `DA-GOBAN-GRID-TILE`, `DA-SECTION-DIVIDER`; never place pattern over interactive intersections.
- Canonical filenames, review status and provenance: `../ASSET_MANIFEST.json`.
