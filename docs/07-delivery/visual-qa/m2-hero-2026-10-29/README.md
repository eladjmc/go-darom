# M2 hero / nav visual QA — 2026-10-29 (pass 3)

Screenshots for owner review. **Not** M2 visual approval until confirmed. **M3 not started.**

| File | Viewport / state |
|------|------------------|
| `desktop-1440.png` | 1440×900 |
| `desktop-1920.png` | 1920×1080 |
| `mobile-360.png` | 360×800 |
| `mobile-390.png` | 390×844 |
| `mobile-390-short.png` | 390×640 (short height) |
| `mobile-430.png` | 430×932 |
| `mobile-390-drawer-open.png` | 390×844, nav drawer open |

Spec: `docs/03-design/docs/HOME_HERO_VISUAL_SPEC.md`  
Re-capture: `node scripts/m2-visual-screenshots.mjs` (requires `npm run dev:web`).

### Limitations noted
- HR-001 has the goban on the **right** of the source. A true left-board plate was **not** produced by mirroring. Instead, a board-weighted crop (`home-hero-visual-pane.webp`) fills the **left** visual pane; content sits in a solid **right** cream panel.
