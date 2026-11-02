# M4 Live Go — Implementation Roadmap

**Status:** APPROVED — implementation in progress  
**Authority:** `M4_PLANNING_GATE.md` D1–D8 + engineering corrections

## Tasks

### T0 Docs — done
### T1 Schema — `game_invites`, `games`, `live_game_occupancy`, `game_command_receipts`
### T1b Goban React smoke (D5) — before full play UI
### T2 InvitationService + concurrent accept + logout cancel
### T3 GameService play/pass + version + durable idempotency + socket update
### T4 Resign / undo / scoring / clock / no-winner / finish+occupancy TX
### T5 Web: invite modal, `/play/:id`, dedicated game chat (ADR-017), return chip, replay
### T6 Idle 48h mutual no-winner only (no convert)
### T7 Gates + manual checklist; stop for owner approval (no M5)

## Slice test rule

After each Ti: run relevant vitest + keep `typecheck` green. Record failures honestly.
