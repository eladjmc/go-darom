# Requirements Inventory — Initial Traceability Seed

**Status: DRAFT.** This is a domain-level requirements inventory, not full use cases. Future PRD decomposes each group into testable `MUST` statements, acceptance scenarios and cross-references to approved decision IDs.

| Group | Required capability | Primary decisions | Future owner specification |
|---|---|---|---|
| IDENTITY | Google/Clerk login, first-time setup, profiles, roles, admin bootstrap | AUTH-001–008 | Product: Identity; HLD: Auth; Identity LLD |
| DIRECTORY | Authenticated member search, presence indicator, user actions | AUTH-003–005; COMM-002 | Community LLD / Presence LLD |
| LIVE_INVITES | Configure game before sending; notify; accept, reject, expire, cancel and race protection | GAME-006–009 | Invitation state machine; REST/Socket contracts |
| LIVE_GAME | Server-authoritative legal moves, captures, clocks, pass, undo, resignation, scoring, agreed no-result, reconnect | GAME-002–015 | Game Engine POC; Game LLD; scoring LLD |
| ASYNC_GAME | Offline invitation for 3 days, turn deadlines/reset, parallel games, persistent turn notifications | GAME-016–018 | Async game LLD; scheduler/deadline policy |
| STUDY | Personal/shared study boards, dual editing, global Undo, save, rejoin, removal, ownership transfer | STUDY-001–007 | Study Board LLD |
| CHAT | One public room, DMs, message history, unread state, notifications | COMM-001–002,006; GAME-018 | Chat LLD; Notification LLD |
| TRUST | Blocking, reporting, bounded DM report context, admin deletion and suspension | COMM-003–008 | Moderation LLD; permission matrix |
| EVENTS | Unlimited/limited events, registration, 15-min guest holds, email verification, export, cancellation | EVT-001–009 | Events LLD; Email LLD |
| MEDIA | Event galleries; administrator uploads; managed storage abstraction | EVT-010; ARCH-007 | Media LLD; photo permissions |
| CONTENT | Distinct announcement/guide entities, shared Tiptap editor, admin publishing | CMS-001–003 | CMS LLD |
| LEARNING | Open library, embedded videos, interactive guide boards, no progress tracking | CMS-004–005 | Learning LLD |
| PUZZLES | Puzzle library, manually chosen weekly feature, board editor, SGF and branching valid solutions | PUZZ-001–004 | Puzzle POC; Puzzle LLD |
| HOME | Public community-first landing page and navigation, shop placeholder | PROD-001,004–005; UX-001–006 | UX screen specs |
| USER_AREA | Active games, saved study boards, event registrations, game replay, account settings | GAME-010,015; STUDY-001; EVT-007 | UX specs; domain LLDs |
| ADMIN | Integrated `/admin` management for events, content, gallery, puzzles, users and reports | AUTH-006–008; EVT-009; CMS-001; COMM-004 | Admin UX; permissions matrix |
| PRIVACY | Data deletion/anonymization, guest PII purge at 90d, report retention up to one year | COMM-007–008; EVT-011; STUDY-006 | Privacy lifecycle matrix |
| OPERATIONS | Local/Prod, resilience, backup/restore, observability, adapters for providers | ARCH-001–012 | HLD; Deployment and Ops specs |
| DESIGN | Light warm premium RTL UI, polished motion, mobile first; OGS-conventional game room | UX-001–006 | Design system; UX; screen contracts |

## Acceptance criteria conventions to apply later

- Every requirement has: trigger, preconditions, actor, result, failure cases, permission rule, persistent side effects, visible UI feedback and test(s).
- Every realtime operation has: authenticated actor, command identifier, version check where appropriate, canonical server confirmation, idempotent retry, reconnect behavior.
- Every time-bounded operation has: UTC stored timestamps, server-side deadline adjudication, duplicate/late action resolution, user-facing status.
- Every personal-data workflow has: collection rationale, access rules, retention and deletion behavior.
- No requirement is fulfilled by a screenshot or mock interaction alone.
