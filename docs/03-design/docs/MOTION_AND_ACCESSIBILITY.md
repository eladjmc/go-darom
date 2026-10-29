# Motion, Interaction and Accessibility

**Status:** DRAFT. Motion values are proposals; validation required before sign-off.

## Motion principles
- Motion should communicate feedback, location and state; never delay moves or obscure board intersections.
- Prefer CSS transitions for simple microinteractions; avoid adding animation dependencies unless justified in implementation LLD.
- Baseline proposals: hover/press 100–180ms, cards entering viewport 250–400ms, navigation overlays 160–240ms; restrained easing. No mandatory entrance delay on critical controls.
- Honor `prefers-reduced-motion: reduce`: eliminate parallax, loops, scroll-linked effects, stone-drop flourish; keep immediate state feedback.
- No continuous moving background around playable boards or chat input; animation must not imply successful moves before ACK.

## Interaction mapping
| Element | Motion / feedback proposal | Functional guardrail |
|---|---|---|
| Home hero | Gentle image reveal, subtle stone motif | Copy visible immediately; no autoplay video by default |
| Content cards | Small lift / shadow and focus ring | No card movement that causes accidental tap; no hover-only action |
| Buttons | Subtle pressed depth | Distinct loading/disabled states |
| Notification toast | Short slide/fade, close/accept affordance | Bell persists; actionable invites don't vanish without accessible equivalent |
| Go stone placement | Ghost stone on hover, gentle placed-state animation after ACK | Correct intersection and turn legality, accessible confirmation |
| Game pending move | Slight translucent marker | Not represented as committed until server response |
| Puzzle correct solution | Brief positive highlight | No scoreboard or ranking; text feedback available |
| Puzzle incorrect solution | Gentle nonviolent feedback | Do not rely on red alone; retry remains available |
| Study concurrent update | Small highlight on changed point | Undo may reverse another participant's last action; show textual hint |
| Admin save/publish | Toast + persisted status label | Success only after server confirmation |

## Accessibility targets
- Aim for WCAG 2.2 AA review, with clear accommodations for board-game interaction where keyboard and touch interaction need custom controls.
- Keyboard accessible nav/dialog/forms with focus trap for modals, Esc where safe, focus restoration after close.
- Visible focus ring; semantic headings, lists, form labels and errors; accessible name for every icon-only button.
- Color contrast of text/buttons verified using actual design tokens; do not convey player color/state only by colored dots.
- Touch target approximately 44px where possible. Go intersections are physically denser on 19×19; therefore add a touch accuracy affordance (zoom, target magnifier or preview/confirm — design selection pending testing).
- Screen-reader descriptions for Go state should expose current turn, move legality and coordinates; board alternative input (coordinate chooser or keyboard grid) requires evaluation in interactive prototype.
- Hebrew `dir=rtl` at document level; code, SGF, clock strings and coordinates can use isolated LTR spans without reversing symbols.
- Images require meaningful alt/captions or decorative empty alt; avoid text baked into images.
- Videos should have captions or transcripts when feasible, with an accessibility policy before public launch.
- Live announcements (invites, errors, turn change) should use restrained accessible live regions, not one announcement per public chat message.

## Performance constraints
- Animation must run without causing full React rerender of the entire game board per frame.
- Serve optimized images with stable aspect ratios/lazy loading below fold.
- Defer nonessential motion and media from first meaningful view; do not compromise first-time visitor access due to heavy hero visual.
- Avoid unnecessary large UI libraries merely for transitions.
