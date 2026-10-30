# M3 Manual QA Checklist

**Milestone:** M3  
**Environment:** local (`npm run dev:api` + `npm run dev:web`) after `npm run db:migrate`

## Setup

- [ ] Two member accounts (A, B), both completed onboarding  
- [ ] Optional third account or admin bootstrap for moderation checks  

## Presence (multi-tab + debounce)

- [ ] A and B on `/community` — each sees the other as מחובר/ת when connected  
- [ ] A opens a second browser tab — still **one** online entry for A  
- [ ] A closes all tabs; B still sees A online for ~10 seconds, then לא מחובר/ת  
- [ ] A reconnects within 10 seconds after last disconnect — offline transition cancelled  
- [ ] Guest cannot use online filter / member socket features  

## Community chat

- [ ] A posts Hebrew message; B receives it without refresh  
- [ ] History loads older pages when scrolling/loading prior seq (if exercised)  
- [ ] Public chat does **not** create a toast for B  
- [ ] Report on public message succeeds  
- [ ] Admin can remove a public message; clients show removed state  

## Direct messages

- [ ] A opens הודעה from B’s member row → `/dms/:id`  
- [ ] Messages persist across refresh; unread clears after read  
- [ ] B receives **toast** for new DM and can open thread  
- [ ] Multiple tabs for B both stay consistent after reconnect  

## Blocking

- [ ] A blocks B — neither can open/send new DMs (Hebrew error)  
- [ ] Public community chat still visible for both  
- [ ] A unblocks B from האזור שלי — DM works again  

## Reporting / admin

- [ ] B reports a DM from A  
- [ ] Admin opens `/admin`, opens report — sees ≤11 context messages (±5 + reported)  
- [ ] Admin access to DM context is acceptable (server audit log written)  
- [ ] Admin resolves report; it leaves open queue  
- [ ] Non-admin hitting admin APIs gets 403 / forbidden UI  

## Notifications

- [ ] Persistent notification created for DM (API `/notifications`)  
- [ ] Toast is transient and dismissible; separate from bell persistence  
- [ ] Header notifications control visible when signed in  

## Regression / polish

- [ ] RTL Hebrew copy throughout community/DM/admin surfaces  
- [ ] No raw JSON on frontend routes  
- [ ] M2 sign-in / onboarding / directory search still work  

## Sign-off

| Role | Date | Result |
|---|---|---|
| Owner | | Pass / Fail + notes |
