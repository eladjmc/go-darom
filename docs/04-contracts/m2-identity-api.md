# Contract: M2 Identity & Presence (draft)

**Milestone:** M2  
**Status:** PROPOSED with M2 LLD  
**Auth:** Clerk Bearer JWT unless noted

## `GET /me`

**401** if missing/invalid token.

**200**

```json
{
  "id": "uuid",
  "nickname": "string|null",
  "avatarUrl": "string|null",
  "role": "member|admin",
  "onboardingCompleted": false,
  "suspended": false
}
```

## `PATCH /me`

Body (all optional except when completing onboarding):

```json
{
  "nickname": "string",
  "avatarUrl": "string|null",
  "completeOnboarding": true
}
```

Rules: nickname 2–32 chars, trimmed; no email exposure; server sets `onboardingCompleted` only when nickname present.

**200** updated profile · **400** validation · **401** · **403** suspended

## `GET /members?q=`

Authenticated **and** caller must have completed onboarding (**403** otherwise).

Returns `{ "items": [ { "id", "nickname", "avatarUrl", "online" } ] }` — nickname + photo only.

Ordering: `nickname ASC`, then `id ASC`. Soft cap: 50 rows (no pagination in M2).

## Socket (foundation)

- Handshake: Clerk token → internal user id
- Server maintains connection count per user
- Events (names provisional): `presence:snapshot`, `presence:user` `{ userId, online }`
- No chat payloads in M2
