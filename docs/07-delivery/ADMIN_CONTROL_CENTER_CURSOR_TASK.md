# Cursor task — M3 Admin Control Center foundation

Read `docs/03-design/ADMIN_CONTROL_CENTER_SPEC.md` together with the approved PRD and HLD; treat the specification as a proposed UI/administration architecture extension, not permission to alter approved product capabilities.

The owner clarified that the Admin area is the **central management workspace for the entire Go Darom site**, with tabbed/sectioned management for members, reports, events, Go puzzles, content, and aggregate operating statistics. The phrase “Go problems” means **puzzle authoring/editing**, not administering live games. Do not add admin visibility into private games, game records or boards.

Implement **only the M3 slice now**:
- A scalable, polished Admin Shell within the existing React SPA, RTL right-side navigation, responsive mobile admin navigation, and admin-only `ניהול` entry in global navigation.
- Functional overview with only currently available real data, reports/moderation, member management.
- Replace all raw JSON and internal enums on current `/admin` with readable report details, actual reporter/reported identity, scoped DM evidence ±5 messages and audited access.
- Current approved actions: report resolve, remove public message, suspend/unsuspend member; clear confirmations and feedback.
- Preserve backend admin authorization; no broad inbox browsing; no access to private games.
- Provide clean extension points for future Events (M6), Puzzles and CMS (M7), and optional aggregate game activity analytics after Games is implemented. Do not add dead links, fictitious data or those future APIs now.
- Inspect existing services and screens before changes; avoid unnecessary migrations or refactoring.
- Update milestone-specific LLD/contracts/acceptance docs before implementation; document any existing API projection gap that needs correction.
- Test with 1 admin + 2 members; run typecheck, lint, tests, build and attach UI screenshots at desktop and mobile sizes.
- Stop before M4 for owner manual QA.

If an important product/permissions choice is not resolved by the approved sources, report it before implementing that choice.
