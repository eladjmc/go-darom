# Go Darom — MVP Scope and Boundaries

**Status:** DRAFT | **Rule:** All listed feature domains are in MVP; staged implementation does not mean staged omission.

| Feature domain | MVP commitment | Explicitly excluded / later |
|---|---|---|
| Identity | Google/Clerk, onboarding nickname/photo, guest/member/admin, directory/presence | Social follow graph, ELO profiles |
| Games | Live, correspondence, clocks, Japanese scoring, configurable komi/colors/handicap, invites, undo, pass/resign, amicable endings, persistence/replay | Matchmaking, rated games, tournaments, AI analysis |
| Study | Personal + two-member shared board, live edits, global undo, persistence | Large collaborative rooms, variation tree/AI study |
| Community | One public chat, DMs, user block, reports, moderation, notifications | Voice/video chat, chat file uploads, many channels |
| Events | Capped/unlimited, Google member and email-verified guests, 15m reserve, cancellation, transactional emails, admin export | Waitlist, routine reminder emails, tickets/payments |
| Content | Announcements, guides, videos, interactive guide boards, galleries, Admin/Tiptap | LMS courses/tests/progress, user photo uploads, announcement comments |
| Puzzles | Public library, featured weekly puzzle, SGF import, board editor, multiple solution branches | Solved history, scores, ranking |
| Store | Polished Coming Soon placeholder | Product catalog, checkout, payments |
| UX | Modern warm RTL UI, responsive board room in conventional OGS style, microinteractions, accessibility | Advanced analysis views or competitive stats |
| Ops | Local/Prod, monitoring, production backups, privacy lifecycle, least-privilege admin | Mandatory staging environment, distributed microservices |

## Release discipline
1. Every committed domain above must exist and meet its acceptance criteria before labeling **full MVP launch**.
2. Iterative vertical slices may be demoed internally but are not the full MVP.
3. An unsupported game-engine requirement must trigger explicit product/architecture review, not silent feature deletion.
4. No unexpected third-party service, recurring cost, tracking service or product feature without approval.
