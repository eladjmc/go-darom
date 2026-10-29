# Contract: Health API

**Milestone:** M1  
**Transport:** HTTP REST  
**Auth:** None

## `GET /health`

### Response `200 application/json`

```json
{
  "status": "ok",
  "db": "up",
  "version": "0.1.0-m1"
}
```

| Field | Type | Meaning |
|---|---|---|
| `status` | `"ok"` \| `"degraded"` | `ok` when DB up; `degraded` when DB down |
| `db` | `"up"` \| `"down"` | Result of DB ping |
| `version` | string | API package version string |

### Errors

- Process down → connection failure (no body).
- Never returns credentials or connection strings.
