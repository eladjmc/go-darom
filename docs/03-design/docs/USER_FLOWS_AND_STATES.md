# UX Flows, State Inventory and Edge Behaviors

**Status:** DRAFT; derived from approved user journeys and business rules.

## F-01 Discover → Authenticate → Complete original action
Public visitor opens guide/puzzle/event → no auth interruption. On 'join chat' or 'invite member' require Clerk Google → first-login nickname/photo confirmation → restore exact intended route/action if still possible. If invite/member no longer available show safe informational fallback, not silent redirect to homepage.

## F-02 Live game invitation
Member opens profile or chat user menu → selects Live invite → setup modal (9×9, no clock, 6.5 komi, random colors, optional handicap changing suggested komi to 0.5) → confirms → recipient sees bell and live actionable toast → accept/decline. Both users' availability revalidated at accept. Five-minute expiration; cancel if sender intentionally logs out or starts another live game; unknown disconnect gets 10s grace. Expired toast and notification provide resending option, but never duplicate acceptance.

## F-03 Live play and recovery
Successful acceptance opens room for both → current player places stone → pending UI → server validation + durable commit → both clients advance. Repeat/duplicate requests do not apply twice; rejected action reloads current snapshot. Navigating away preserves game; site header shows return CTA. Refresh or reconnect shows status and restores latest board/history. No-clock idle >48h: show consensual resolution/convert-to-async affordance, not automatic loss. Rules of unilateral end remain OPEN-003.

## F-04 Scoring / finish
Two passes → scoring preview, dead-stone designation → each player accepts or requests resume. If both accept, show result and Replay; if dispute, resume. At any time participant may propose mutually agreed no-winner end, must receive acceptance. Resignation results in regular loss with clear confirmation.

## F-05 Async invite and turns
Choose Async + board/komi/colors/handicap + move-time none/24h/3d/7d → send invite (expires in 3 days independent of sender presence) → accept → personal area shows 'your turn' or 'waiting'. On completed move reset deadline according to rules; persist notification for opponent, toast if online. Opening after offline reconnect displays server-computed deadline/result.

## F-06 Study collaborate
Member opens own saved board → selects invite friend → second member accepts (duration OPEN) → both may place, delete stones and global undo. Each action acknowledged by server; stale client refreshes. If one leaves, other can continue. Partner 'remove from my list' should not delete for all (return/rejoin semantics OPEN); creator 'delete for everyone' requires confirmation. When creator deletes account, surviving participant inherits ownership.

## F-07 Guest event registration
Guest opens event → submits name/email and optional phone/experience → if capacity limited, 15-min provisional hold with server timestamp → pending email verification messaging → verify token → registration confirmed and confirmation mail. Invalid/expired token gives recovery path; capacity never exceeded. Member path skips guest verification and registers in one click. User can cancel using secure link or member area. Event cancellation/change sends operational email; no reminder mail.

## F-08 Puzzle / learning
Visitor browses library → opens puzzle → sees turn/goal → taps intersection → sees feedback and possible opponent response according to valid solution tree → hint or retry → explanation. No account/progress/rating stored. Learning guide may embed interactive board (precise interactions OPEN); public video embed remains accessible.

## F-09 Reporting / blocking / account deletion
From DM message report action, member selects reason and context → admin report console exposes only bounded adjacent messages and logs access → admin resolves with permitted action. Blocking prevents new DMs and invites but preserves public messages and active game. On account deletion prompt displays clear consequences → request accepted → signed-in interactions disabled → resumable deletion workflow anonymizes shared data and transfers Study ownership.

## State requirement for every screen
| State | User-visible requirement |
|---|---|
| Loading | Stable layout/skeleton rather than jumping controls; no fake content |
| Empty | State-specific Hebrew guidance and next step |
| Offline/reconnecting | Visible nonblocking banner; disable unsafe mutation and reconcile after reconnect |
| Action pending | Accessible spinner/label; prevent accidental repeat actions |
| Server rejection | Restore server-authoritative state; explain without exposing secrets |
| Forbidden/suspended | Explain access limitation, never leak protected content |
| Error | Retry only when safe/idempotent, provide exit route |
| Success | Confirm only on server acknowledgement; avoid unnecessary modal interruption |

## UX acceptance examples
- A mobile user at 390px can always locate Pass/Undo/Resign while looking at a 19×19 live board without scrolling through message history.
- An event guest understands that reservation is provisional until email verified.
- An incoming Live invite that expires while open becomes unclickable and offers re-invitation.
- A player who switches pages sees a persistent live-game return affordance.
- A member whose profile is blocked cannot initiate direct contact; public posts remain visible.
