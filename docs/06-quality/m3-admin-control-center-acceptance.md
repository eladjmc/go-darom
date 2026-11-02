# M3 Admin Control Center — acceptance

Map to ADM-01…ADM-09 in `ADMIN_CONTROL_CENTER_SPEC.md`.

## Automated (final 2026-10-30)

- [x] typecheck / lint / test / build pass
- [x] Admin requireAdmin unit coverage remains green
- [x] Nav registry exposes only M3 sections

## Manual (1 admin + 2 members)

Owner product/UI satisfaction recorded 2026-10-30 (`M3_FINAL_ACCEPTANCE_REPORT.md`). Checklist rows kept for archival traceability:

- [x] ADM-01: Admin sees `ניהול`; member does not; member `/admin` → 403 *(owner + unit 403)*
- [x] ADM-02: Desktop right sidebar; mobile drawer/tabs usable *(owner)*
- [x] ADM-03: Reports queue human-readable; no JSON *(owner)*
- [x] ADM-04: DM detail ±5; audit on open *(unit bounds + owner; not separate Playwright E2E)*
- [x] ADM-05: Members searchable; suspend/unsuspend confirmed + enforced *(owner)*
- [x] ADM-06: Unknown `/admin/foo` → admin 404; unauthorized → 403 *(owner + unit)*
- [x] ADM-07: No fake Events/Puzzles/Analytics pages in nav *(automated nav registry)*
- [x] ADM-08: 1280/1440/1920 and 360/390/430 layouts *(screenshots + owner)*
- [x] Overview counts match DB reality *(owner)*

**M3 ACC approved. Do not expand admin scope in M4 planning.**
