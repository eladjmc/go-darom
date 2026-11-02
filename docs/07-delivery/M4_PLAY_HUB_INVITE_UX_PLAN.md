# M4 Games Hub & Invitation Dialog — Visual Layout Plan

**Date:** 2026-10-30  
**Status:** Plan for implementation (UI only; no GameService / engine / DB / invite business-rule changes)  
**Authority:** Owner brief in chat; HLD/PRD unchanged

## Goals

1. Hub feels like a balanced dashboard, not a narrow stacked column.
2. Invitation flow is a polished two-step modal that never clips title/actions.
3. Same brand language as home / community / messaging.

## Desktop page grid (~1150–1250px)

```
┌──────────────── play-hub-inner (max ~1200px, centered) ────────────────┐
│  [משחקים + lede]                          [הזמנת חבר למשחק CTA]       │
│  ┌── המשחק שלי (≈1.15fr, primary) ──┐  ┌── הזמנות (≈0.95fr) ──────┐ │
│  │ Active card OR compact empty     │  │ Tabs: נכנסות | יוצאות    │ │
│  │ Avatar · chips · חזרה למשחק      │  │ Compact invite rows       │ │
│  └──────────────────────────────────┘  └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- Game column is visually heavier (wider, stronger border/accent).
- Invites are secondary density.
- No oversized empty white rectangles; compact dashed empty strips.

## Mobile stacking

1. Header + full-width CTA  
2. המשחק שלי  
3. הזמנות למשחק  

Break ≤960px → single column. Touch targets ≥44px on accept/reject/cancel.

## Two-step modal (portal)

| Step | Title | Body | Footer |
|---|---|---|---|
| 1 | למי שולחים הזמנה? | Search, online filter, compact member rows, selected state | סגירה (header) · המשך להגדרות |
| 2 | הגדרות המשחק | Opponent summary + board/clock/color/handicap/komi | חזרה לבחירת חבר · שליחת הזמנה |

Ineligible: offline → disabled with Hebrew title; self excluded; server still authoritative on send.

## Modal viewport & scrolling

- `createPortal(…, document.body)`
- Overlay: `position: fixed; inset: 0; place-items: center; padding: 16px`
- Card: `width: min(100%, 34rem)`; `max-height: calc(100dvh - 32px)` (+ `100vh` fallback)
- Layout: sticky header / scrollable body / sticky footer (no whole-card scroll)
- Body scroll only when content exceeds remaining height
- `overflow: hidden` on `document.documentElement` while open
- Escape, focus trap, backdrop click → close; restore focus to opener
- Short height + 200% zoom must keep title + primary footer actions reachable

## Component reuse

| Piece | Role |
|---|---|
| `PlayModalShell` | Portal, a11y, lock scroll, focus trap |
| `InviteFlowModal` | Steps 1–2 orchestration |
| Existing `fetchMembers` / create-invite APIs | Unchanged |
| Hub CSS tokens | Cream / sage / brand from design system |

## Out of scope

Game room, GameService, GoEnginePort, DB rules, invite TTL/accept CAS, M5, marking M4 complete.
