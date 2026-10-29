# Go Darom — Decision Register

**Status:** DRAFT, pending verification and approval.  
**Scope:** Decisions confirmed in the discovery discussion. IDs are provisional but stable within this draft.

## Product and scope

| ID | Approved decision |
|---|---|
| PROD-001 | Go Darom is a free, friendly, Hebrew RTL Go community platform serving southern Israel; welcome beginners and returning players. |
| PROD-002 | MVP includes all approved modules, delivered incrementally behind verified milestones. |
| PROD-003 | No ELO, public player ranking, competitive leaderboards, tournaments or automated matchmaking. |
| PROD-004 | Shop is a polished **Coming Soon** page only; no commerce or payments in MVP. |
| PROD-005 | Public visitors can access informational content, learning resources, puzzles, events and galleries without login. Social features and games require membership. |

## Identity, users and permissions

| ID | Approved decision |
|---|---|
| AUTH-001 | Google-only sign-in/up via Clerk. Internal user UUID is distinct from Clerk identity; external IDs mapped separately. |
| AUTH-002 | First sign-in: very short screen confirming/editing display nickname and profile photo; then return to the originally requested action if still available. |
| AUTH-003 | Member profile consists of nickname and photo only, both editable; no public email, bio, level, ranking or performance statistics. |
| AUTH-004 | All community members are visible in a member directory **to authenticated members**, searchable by nickname. |
| AUTH-005 | Online status is visible to authenticated members; online means an active site connection, not merely an active Clerk session; multiple tabs count as one member. |
| AUTH-006 | Three user roles: guest, member, administrator; permissions enforced by server, not frontend routing alone. |
| AUTH-007 | Admin area lives in the same React application at protected `/admin`. |
| AUTH-008 | First administrator is provisioned through a secure one-time bootstrap process. |

## Architecture, deployment and operation

| ID | Approved decision |
|---|---|
| ARCH-001 | Frontend React + TypeScript + Vite; backend Node.js + Express + TypeScript as a separate, single service. |
| ARCH-002 | Backend layering: controllers → application services → repository interfaces/contracts → DAL. Prefer dependency injection without heavyweight framework. |
| ARCH-003 | PostgreSQL with Drizzle ORM and Drizzle Kit migrations; avoid leaking ORM-specific types into services. |
| ARCH-004 | REST for regular operations and Socket.IO for real-time communication, presence, game and board updates/notifications, on a single server for MVP. |
| ARCH-005 | Local development with Docker Compose. MVP environments: **Local + Production only**; do not add Staging yet. |
| ARCH-006 | Deployment direction: Netlify frontend, Render single backend service, Supabase PostgreSQL on free/low-cost plans; preserve potential future VPS migration. |
| ARCH-007 | Media storage: Supabase Storage behind a Storage Adapter. |
| ARCH-008 | Transactional email provider: **Brevo**, behind EmailService Adapter. |
| ARCH-009 | Manual backups during development; automatic off-provider backups and restore validation required before production launch. |
| ARCH-010 | Persist authoritative game, invite, notification and study data in PostgreSQL; recovery must tolerate reconnect and server restart. |
| ARCH-011 | Goban renderer + goban-engine are **POC candidates, not yet approved as final dependencies**. Isolate game implementation behind an adapter. |
| ARCH-012 | Documentation: approved system-wide Product and HLD upfront; detailed LLD per milestone must be approved before implementation. Engineering docs in English; UI/UX copy in Hebrew. |

## Go gameplay and invitations

| ID | Approved decision |
|---|---|
| GAME-001 | Support Live, correspondence/async games, and personal/shared free-form Study Boards. |
| GAME-002 | Board sizes: 9×9, 13×13, 19×19. Japanese rules with territory scoring. |
| GAME-003 | Default normal-game komi 6.5, editable **before sending invitation**. |
| GAME-004 | Color assignment random by default; inviter may select colors during invitation setup. |
| GAME-005 | Handicap in MVP: auto-placed stones, up to 4 on 9×9; up to 9 on 13×13/19×19, subject to verified engine support and valid placements. Default komi with handicap 0.5, editable. |
| GAME-006 | Live invite parameters selected before sending; default 9×9, no clock. Optional 15-minute absolute clock per player. |
| GAME-007 | No concurrent active Live games for a member. Multiple async games may coexist. |
| GAME-008 | A Live invitation expires after 5 minutes, or cancels on inviter's intentional logout, or when inviter starts another Live game. Unexpected disconnect/refresh gets 10 seconds' grace before cancellation. |
| GAME-009 | Invitation acceptance validates availability of both participants and invite validity atomically; competing Live invitations close when a Live game starts. |
| GAME-010 | Live game persists when user navigates elsewhere; a persistent site-level indicator links back to the active game. Reload/reconnect restores server-authoritative state. |
| GAME-011 | Players may request Undo of a Live move by mutual agreement; pass and resign are available. |
| GAME-012 | Two consecutive passes trigger dead-stone marking and mutual confirmation of score; players can resume play to resolve dispute. |
| GAME-013 | Either player can propose a mutually agreed no-winner ending at any stage; store it distinctly from scored win/resignation/timeout. |
| GAME-014 | After 48 hours of inactivity in an untimed Live game, offer a route to end it or convert to async **by mutual agreement**; no automatic loss merely for passing 48 hours. |
| GAME-015 | Finished games are retained with move-by-move Replay accessible to the participants. No public ranking. |
| GAME-016 | Async time per move (resets every turn): none, 24h, 3 days or 7 days; time expiry causes loss when a limit was selected. |
| GAME-017 | Async invitations remain available while inviter is offline and expire after **3 days**. |
| GAME-018 | Players receive persisted bell notifications and real-time toasts for meaningful invitations/turns; avoid toast spam for ordinary public-chat messages. |

## Study Board

| ID | Approved decision |
|---|---|
| STUDY-001 | Personal and shared Study Boards, free-form stone placement/removal (not constrained by ordinary Go move legality), saved and reopened from personal area. |
| STUDY-002 | Shared board is by direct member invitation, with **maximum two participants**. Both participants have free editing rights. |
| STUDY-003 | Undo reverses the globally most recent board operation regardless of actor; shared updates synchronize in real time. |
| STUDY-004 | A participant may disconnect and the other may continue editing; board persists if both leave. |
| STUDY-005 | Only the creator may delete the shared board for everyone; other member may remove it from their personal list. |
| STUDY-006 | If creator deletes their account, shared-board ownership transfers to surviving participant; personal boards are deleted. |
| STUDY-007 | Server is authoritative for all operations; a UI action is not considered committed until server acknowledgment. |

## Community and moderation

| ID | Approved decision |
|---|---|
| COMM-001 | One central community chat, plus member-to-member private conversations; text, history, avatars/name, unread counters, member profile actions. |
| COMM-002 | Authenticated members can initiate DMs and send game invitations to other members, subject to blocks. |
| COMM-003 | Blocking prevents **direct** messages/invitations in both directions; public community-chat posts remain visible. Existing games remain playable or can be ended/resigned. |
| COMM-004 | Admin can handle reports, remove public chat messages and suspend members. |
| COMM-005 | For reports on a private message, admin may view only the reported message plus a bounded number of adjacent messages for context, not browse arbitrary private chats. |
| COMM-006 | Chat message history remains until deletion under approved policy. |
| COMM-007 | Closed moderation reports are retained up to one year, subject to legitimate legal retention need. |
| COMM-008 | Account deletion removes identifying information and anonymizes retained shared content; blocks/participation handled consistently. |

## Events, galleries and email

| ID | Approved decision |
|---|---|
| EVT-001 | Hybrid registration: authenticated members register in one click; guests register without Clerk account. |
| EVT-002 | Guest registration fields: name and email required; phone and Go experience optional. |
| EVT-003 | Guest email verification by magic verification link before registration is confirmed. |
| EVT-004 | Limited-capacity events reserve a guest seat for **15 minutes** pending email verification; expire and release seat if not verified. |
| EVT-005 | Each event may be unlimited or capacity-limited; no waitlist in MVP. Capacity enforcement is atomic. |
| EVT-006 | Public sees registered count only, not registrant identities; administrators manage registrations and participant data. |
| EVT-007 | Members/guests can cancel their own registration; guests use secure personal cancellation links. |
| EVT-008 | Transactional emails for confirmation, cancellation and substantive event changes only; **no routine pre-event reminders**. |
| EVT-009 | Admin can create/edit/cancel events, add participants manually, manage capacity/registrations and export CSV. |
| EVT-010 | Event photos/gallery uploads are admin-only; event-specific galleries and community gallery supported. |
| EVT-011 | Guest registration personal information retained **90 days after the event**, subject to applicable legal requirements. |

## Content, learning and puzzles

| ID | Approved decision |
|---|---|
| CMS-001 | Custom React admin interface using Tiptap editor; no separate CMS product for MVP. |
| CMS-002 | Only admins publish announcements and guides; no announcement comments in MVP. |
| CMS-003 | Announcements and learning guides are distinct content types with shared editing components. |
| CMS-004 | Public learning content library (guides, embedded videos and lectures); **no prescribed learning pathway or progress tracking**. |
| CMS-005 | Interactive Go board demonstrations inside guides in MVP. |
| PUZZ-001 | Public puzzle library and a weekly featured puzzle manually selected by admin. |
| PUZZ-002 | Admin creates puzzles by interactive board editor **and** SGF import. |
| PUZZ-003 | Puzzle solutions may contain multiple correct sequences and branches; optional hints and explanations. |
| PUZZ-004 | No personal puzzle completion tracking, points or leaderboard. |

## UX and design direction

| ID | Approved decision |
|---|---|
| UX-001 | Overall design direction: first reviewed mockup preferred by team — light, warm, premium cream/wood/sage palette, clean hierarchy and welcoming cards. |
| UX-002 | Photography inspiration: third mockup preferred; photography is replaceable and is less critical than the core UI design. |
| UX-003 | Site should have sophisticated visual polish and restrained animation/micro-interactions; accessibility and reduced motion must be accounted for. |
| UX-004 | Game room follows conventional OGS-like layout and interactions, with Go Darom visual shell; mobile prioritizes board and accessible controls. |
| UX-005 | Public homepage emphasizes community, events, weekly puzzle and learning; a visitor should be able to explore before signing in. |
| UX-006 | Game-room and member-area design must remain usable in Hebrew RTL on mobile and desktop. |
