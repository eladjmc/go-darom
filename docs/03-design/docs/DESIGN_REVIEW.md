# UX Design Review and Approval Gate

**Version:** 0.1 | **Status:** DRAFT — not approved by owner.

## Established owner decisions (not for reopening without request)
- Primary visual direction: first generated concept, warm premium light layout; imagery closer to third concept; photos are easily replaceable.
- Game room: conventional OGS-like board-first functional layout.
- Hebrew RTL and responsive, sophisticated restrained animation.
- Profile: nickname/avatar only; visible online presence, no rankings.
- Live setup defaults 9×9 no clock; settings selected before invite.
- All modules in MVP, delivered in milestones.

## Design proposals needing validation
1. **Navigation:** primary labels and whether mobile should have an always-visible bottom bar or simple top menu. Previous UX options were recommended but not explicitly approved.
2. **Brand tokens:** exact shades/font/radius and final vector wordmark. Owner chose logo option #2 and hero option #3, but logo master and derived mobile crop still require QA.
3. **Game-room chat:** whether a separate chat is required within active game vs global DM/community chat (not explicitly settled by approved PRD).
4. **19×19 touch accuracy:** tap-to-preview, zoom/magnifier, or other method; test on actual devices.
5. **Interactive guide board:** strictly guided replay vs ability to experiment on a local copy; product specifies interactivity but not exact controls.
6. **Mobile deep-link recovery:** appropriate small-screen rendering of invitation, notification and account menus.
7. **Shared Study Board hide/rejoin:** product edge behavior OPEN; do not invent ownership changes.
8. **Photo/illustration distribution:** decide hero crop and media style per screen when real assets exist.
9. **Responsive game-room layout:** verify clock, pass, resign, undo, scoring and chat are consistently reachable.

## Review checklist before Approved
- [ ] Screen inventory covers each approved PRD module and core role.
- [ ] Header/menu names, IA and page hierarchy approved in desktop and mobile form.
- [ ] Visual tokens and actual font licensing approved after rendered mockups, not by hex alone.
- [ ] At least home, room, event registration, puzzle, chat and admin have reviewed desktop/mobile screen references.
- [ ] Error/empty/loading/offline/reconnect states defined.
- [ ] Interactive Go board proven usable at 9/13/19, including touch, keyboard alternative and focus.
- [ ] Accessible color contrast, reduced-motion, RTL and responsive review completed.
- [ ] No unapproved features inferred from AI imagery.
- [ ] Source docs and open issues crosschecked; no contradictory instructions for Cursor.

## Suggested next deliverables (no application code)
1. Validate IA and a few remaining design-specific choices.
2. Produce actual high-fidelity focused screen mockups for home, game room desktop/mobile, community chat, event registration, puzzle solver and admin (separate from inspiration collages).
3. Iterate tokens/components/motion with screen review; then update this draft to v0.2 and seek formal approval.
4. Following UX approval move to cross-system contracts and Go engine POC planning per roadmap.

### Asset QA gate
- [ ] Manually vectorize selected logo option #2 and verify Hebrew.
- [ ] Verify mobile/desktop crop from selected hero #3, including RTL headline composition.
- [ ] Approve proposed icons, decorations and empty-state art separately from selected source imagery.
