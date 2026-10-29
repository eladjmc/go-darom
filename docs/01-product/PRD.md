# Go Darom — Product Requirements Document (PRD)

**Version:** 0.1 | **Status:** DRAFT — owner approval required | **Language:** English engineering specification; user-facing copy in Hebrew (RTL).

## 1. Purpose and product vision
Go Darom is a free, welcoming online home for the Go-playing community of southern Israel. It helps curious newcomers learn about Go, brings community members together for real-world meetings, enables friendly online play and study, and preserves useful community content. The experience favors friendship, learning and accessibility over competitive status.

### 1.1 Audiences
- **Public visitor:** discovers the community, reads announcements/guides, watches lectures, solves puzzles and registers for an event as a guest.
- **Member:** signs in with Google, chats with members, plays games, uses Study Boards, participates in events and manages personal activity.
- **Administrator:** manages community content, events, galleries, puzzles, user reports and access.

### 1.2 Product principles
1. Hebrew-first UI, RTL throughout, responsive mobile and desktop.
2. Friendly community ethos: no ELO, public leaderboards, player rankings, auto-matchmaking or tournaments in MVP.
3. Public discovery is open; identity is required for interactive social/game functionality.
4. Keep user data private by default and provide meaningful user control.
5. Authoritative, persistent multiplayer state; reconnection should not erase accepted actions.
6. All approved modules belong to MVP; implementation can be sequenced across milestones.
7. Sophisticated but accessible visual design, with animation that respects reduced-motion preferences.

## 2. Product scope and exclusion
All MVP capabilities appear in `MVP_SCOPE.md`. Active retail commerce, payments, rankings, competitive tournaments, AI game analysis, public open-game lobby, advanced LMS/progress tracking, pre-event reminder emails, user-submitted gallery photos and event waitlists are excluded. Shop appears only as a designed **Coming Soon** page.

## 3. Access and roles
- **GUEST** may view public homepage, event descriptions, announcements, learning library, puzzles and public galleries, and register for events using verified email.
- **MEMBER** may access all guest functions plus central chat, private DMs, member directory, profile, games, personal/shared Study Boards, in-app notifications and registration management.
- **ADMIN** has member access plus protected administrative workflows for events, registrations, content, media, puzzles, users and reports.
- Sign-in/sign-up via Clerk **Google only**; internal user UUID separate from external Clerk identity; first login prompts confirmation/edit of nickname and photo and then returns to the original action if still valid.
- Profile exposes **nickname and photo only**; directory visible to logged-in members, searchable by nickname. Online status visible to logged-in members, reflecting active live connections, not persistent auth session.
- `/admin` lives in the same React application, but authorization always enforced server-side.

## 4. Community and communication
### 4.1 Central chat (`COMM-001`)
- One central community text chat with message history, sender nickname/photo and useful unread feedback.
- Authenticated members can post/read; public chat messages do not trigger a toast for each message.
- Admins can remove problematic public messages and process reports.
### 4.2 Direct messages
- Authenticated members can open one-to-one DM from member cards/profiles, with history and unread counts.
- Mutual user block prevents new direct messages and direct game/Study invitations; public community-chat posts remain visible; existing games are preserved.
- User may report a DM; admin access limited to the reported message plus a bounded adjacent context window, never unrestricted access to chats.
### 4.3 Notifications
- Persist meaningful notifications in database and show notification bell; online member receives real-time toast for invites/acceptances, private DM and async turn changes, avoiding spam for ordinary public-chat posts.
- Notifications survive refresh/reconnect.

## 5. Playing Go
### 5.1 Supported modes
1. **Live:** 9×9/13×13/19×19, optional no clock (default) or 15-minute absolute clock per player, one active Live game per member.
2. **Correspondence/async:** multiple games permitted, per-turn timer option none/24 hours/3 days/7 days and reset on each turn; selected timer expiry results in loss.
3. **Study Board:** independent free-form board, personal or shared, without ordinary move-legality enforcement (covered in §6).
### 5.2 Go rules and setup
- Japanese rules, territory scoring, captures, legality/ko/suicide subject to verified Go engine POC.
- Normal-game komi default 6.5, editable before invite. Handicap-game komi default 0.5, editable.
- Colors random by default, customizable when creating invite.
- Handicap supported in MVP with automatic legal placements. Target maximum: 4 stones on 9×9; 9 on 13×13 and 19×19, subject to POC engine/rules validation.
- Invitation displays complete settings before recipient accepts; accepted game has locked rules/settings.
### 5.3 Live invitation life cycle
- Invite created with board size 9×9 and no clock by default; recipient sees persisted bell notification and online toast, can accept or decline.
- Expires five minutes after creation, cancels on detected explicit inviter logout or when inviter starts a different Live game; on unknown connectivity loss use ten-second reconnection grace.
- Acceptance atomically verifies invite validity, inviter/recipient availability, blocking rules and single-Live-game constraint; all competing outstanding invites of player entering Live game are invalidated as appropriate.
- Expired/rejected invite shows concise feedback and option to create a new invite.
### 5.4 Play, continuity and ending
- Game authoritative server-side; actions accepted only after server acknowledgement, transactional/ordered and safe under duplicate requests/reconnect.
- Gameplay persists across in-site navigation, reload and transient disconnect; persistent site-wide 'return to Live game' indicator.
- Players may pass, resign and propose Undo subject to both players' approval.
- Two successive passes initiate dead-stone review and mutual approval of Japanese score; disputed marking may resume play.
- Either player may propose ending without a winner at any time, pending the other's approval. Distinguish no-winner result from scored victory, resignation and timeout.
- After 48 hours of inactivity in untimed Live play, offer resolution or conversion to async by mutual agreement, without automatic timeout loss solely for 48 hours. **Unilateral end authority/result unresolved (`OPEN-003`).**
- Finished games are saved with move-by-move Replay accessible to their participants.
### 5.5 Async invites and turns
- Async invitation valid for three days, persists while inviter is offline; acceptance subject to validity/authorization checks.
- Users see 'your turn' and 'waiting for opponent' in personal games area, with in-app notification on turn arrival.
- No automatic email on each turn.

## 6. Study Board
- Personal and shared boards saved and reopened through personal area. Shared boards have up to two members, joined by direct member invitation.
- Both participants may place/remove black and white stones without enforcing ordinary Go move rules.
- Real-time synchronized global operation sequence; Undo cancels latest board operation regardless of actor; Redo supported when logically valid; server confirms mutations.
- If a participant leaves or disconnects, other participant can continue and board persists. Creator alone may delete shared board for everyone; partner may remove from personal list without deleting globally.
- On creator account deletion, surviving partner inherits ownership; personal boards deleted.
- Details of re-entry after hiding, invite expiry and concurrent undo behavior remain tracked in Open Issues.

## 7. Events and registrations
- Public event list/detail includes description, schedule, venue, image, current registered count and available capacity as appropriate; **never public registrant identity**.
- Each event can be unlimited or capped; no waitlist.
- Logged-in member registers in one click; guest form requires name and email and optionally phone and Go experience.
- Guest must verify email through link before confirmation. For capped event, reserve seat for 15 minutes during verification; after expiry release reservation. Capacity, expiry and duplicates must be enforced atomically.
- Confirmation, registration cancellation and material event changes/cancellation trigger **transactional** email; no scheduled reminders. Brevo is approved email provider behind EmailService Adapter.
- Members can cancel from their area; guests receive secure cancellation link.
- Admin can draft/publish/edit/cancel event, change capacity, manage/add registrations manually, export CSV.
- Event photo galleries are uploaded by admins only, accessible through event detail and community gallery.
- Guest personal registration data deleted 90 days after event; aggregate counts, exported files and backups require lifecycle controls and policy.

## 8. Announcements, education and media
- Custom React `/admin` with Tiptap editor; announcements and learning articles/guides are separate content models with reusable editor components.
- Only admins create/publish content; public announcement comments excluded.
- Public learning library supports guides, embedded videos and lecture content, browsable/filterable by useful topic/difficulty. No curated mandatory beginner pathway, scores, learning progress or completion tracking.
- Guides may embed interactive Go-board demonstrations in MVP; exact guided playback vs sandbox interaction remains open before Guide LLD.
- Admin media managed via Supabase Storage through Storage Adapter; photo usage/consent controls before release.

## 9. Puzzles
- Public puzzle library with topic/difficulty browsing and one manually chosen featured 'weekly puzzle' on homepage and puzzle hub.
- Admin creates puzzles on board editor or by SGF import. Puzzle solution tree supports multiple accepted sequences and branches, player/opponent responses and optional hints/explanations.
- User gets interactive correct/incorrect feedback and ability to retry; no personal completion history, points or leaderboard.
- SGF branch import and puzzle engine behavior are POC dependencies; supported subset/validation formalized before LLD.

## 10. Personal area and administration
- Member's personal area provides active Live/async games, completed game Replay, saved personal/shared boards, registered events, nickname/photo edits, account/block management.
- Chats and notifications remain accessible globally.
- Admin dashboard modules for event registrations/export, content, guide/video management, galleries, puzzle editor/weekly selection, member management, reports and suspensions.
- Suspend, remove content and moderation actions subject to audit logging and least privilege.

## 11. Privacy, moderation and retention
- User block suppresses direct contact in both directions but not public community chat; existing games continue.
- Admin views reported DM with only bounded adjacent context, audit logged; no arbitrary access to DM inboxes.
- Chat history kept until deletion under policy; closed reports up to one year after closure unless legal grounds require more.
- Account deletion removes personal identifiers and anonymizes shared history retained for continuity; personal boards deleted; shared board ownership transferred to remaining partner; event registration and other shared-domain details addressed by privacy lifecycle design.
- Guest personal event data retained for 90 days after event, then deleted subject to legal requirements.
- Privacy policy, backups/export cleanup, and security controls are release requirements.

## 12. UX and accessibility
- Approved direction: premium but warm, bright cream/wood/sage visual design modeled on first accepted mockup; photography inspiration from third; imagery replaceable.
- OGS-like conventional board-first game room; responsive RTL, board prioritized on mobile, actions and side-panel chat accessible without excessive scrolling.
- Sophisticated restrained motion, microinteractions, visual assets and high-quality loading/empty/error/offline states; honor reduced-motion and accessibility.
- Hebrew interface examples: 'לומדים, משחקים, נפגשים', 'חידת השבוע', 'האזור שלי', 'חזרה למשחק'. Exact copy requires UX baseline approval.

## 13. Operations and delivery constraints
- React/TypeScript/Vite frontend; Node/Express/TypeScript backend single service; PostgreSQL/Drizzle; Socket.IO; Clerk; Supabase Storage; Brevo.
- Frontend deployment direction Netlify, backend Render, database Supabase; Docker Compose Local; Production. No Staging required in MVP.
- Manual DB backups during development; automated off-provider backups and restore verification required before public launch.
- Resilient against server restart/cold start; authoritative states persisted in PostgreSQL.
- Product/HLD approved system-wide upfront. LLD approved separately before each implementation milestone; full approved MVP delivered incrementally.

## 14. Acceptance criteria (product level)
- Unauthenticated visitor can discover events/content/puzzles; event guest verifies email and receives correct registration state without exceeding capacity.
- New member can authenticate via Google, confirm nickname/photo, return to original intended action and find other members.
- Two members can invite/accept a 9×9 Live game, play valid moves, reconnect without losing committed state, score by agreed Japanese rules and replay finished game.
- Members can play async turns, see deadlines/notifications, and maintain multiple correspondence games.
- Two members can collaborate on saved Study Board with globally ordered Undo; partner retains shared board on creator account deletion.
- Moderation enforces direct block semantics and report-limited access to private messages.
- Admin can manage events, content, guides, galleries and interactive puzzles from authenticated `/admin`.
- Responsive Hebrew RTL UI satisfies agreed visual/accessibility acceptance review.
- Backups are automated/tested before release, and application recovery preserves committed business states.

## 15. Dependencies, open decisions and approval
- `../00-governance/source-reconciliation/DECISION_REGISTER.md` = confirmed owner choices; `../00-governance/source-reconciliation/OPEN_ISSUES.md` = unresolved decisions and POC dependencies.
- Product-level issues relevant to rollout: `OPEN-003`, `OPEN-005`–`OPEN-008`, `OPEN-010`–`OPEN-012`, `OPEN-020`–`OPEN-022`. Their unspecified details are **not approved**.
- Architecture/engine viability (`OPEN-001`/`OPEN-002`) must have a named POC/LLD gate; PRD approval alone does not certify engine support.
- **Approval gate:** owner checks scope, correct distinction between approved/proposed and traceable acceptance criteria. This document remains DRAFT until explicit approval.
