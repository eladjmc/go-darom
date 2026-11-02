# Contract — M3 Admin Control Center API

All `/admin/*` routes require authenticated onboarded **admin** (`requireAdmin`). Members receive 403.

## `GET /admin/overview`

```json
{
  "openReports": 3,
  "suspendedMembers": 1,
  "registeredMembers": 42
}
```

Counts from authoritative tables only (no placeholders).

## `GET /admin/members?q=&status=all|active|suspended`

```json
{
  "items": [
    {
      "id": "uuid",
      "nickname": "כינוי",
      "avatarUrl": null,
      "role": "member",
      "status": "active",
      "onboardingCompleted": true
    }
  ]
}
```

`status`: `active` | `suspended`. No email/Clerk ids. Bounded limit (default 100).

## `GET /admin/reports?status=open|resolved|dismissed`

```json
{
  "items": [
    {
      "id": "uuid",
      "targetType": "public_message",
      "status": "open",
      "reason": "…",
      "createdAt": "ISO",
      "reporter": { "id": "uuid", "nickname": "…", "avatarUrl": null },
      "reported": { "id": "uuid", "nickname": "…", "avatarUrl": null }
    }
  ]
}
```

`reported` derived from frozen context snapshot sender of the reported message.

## `GET /admin/reports/:id`

Structured detail (not raw snapshot dump):

```json
{
  "id": "uuid",
  "targetType": "dm_message",
  "status": "open",
  "reason": "…",
  "createdAt": "ISO",
  "resolutionNote": null,
  "reporter": { "id": "uuid", "nickname": "…", "avatarUrl": null },
  "reported": { "id": "uuid", "nickname": "…", "avatarUrl": null },
  "reportedMessageId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "threadSeq": 10,
      "body": "…",
      "createdAt": "ISO",
      "isReported": true,
      "sender": { "id": "uuid", "nickname": "…", "avatarUrl": null }
    }
  ]
}
```

DM open → audit `dm_report_context_read`. Messages already bounded ±5 at report creation.

## `GET /admin/audit?limit=50`

```json
{
  "items": [
    {
      "id": "uuid",
      "action": "user_suspend",
      "entityType": "user",
      "entityId": "uuid",
      "createdAt": "ISO",
      "actorNickname": "…"
    }
  ]
}
```

No unrestricted private payload exposure in `detail` for UI list (omit or sanitize).
