# Visual References and Usage Rules

**Status:** DRAFT. These visuals were created during Go Darom concept exploration; the owner/team preferred the first visual UI direction. Photography from the third concept was preferred. Neither reference is a pixel-perfect approved screen or a claim about existing community activities.

## Reference files
- `assets/direction-A-approved-layout.png`: **PRIMARY style inspiration**. Bright cream/wood/sage palette, editorial homepage layout, elevated cards, friendly community feeling, warm Go motifs, desktop plus mobile overview.
- `assets/direction-C-photography-reference.png`: **SECONDARY photo inspiration**. Airier Go-board closeups and natural/documentary photography, not necessarily its color tokens or layout.

## Keep / adapt / exclude
| Keep | Adapt | Do not copy |
|---|---|---|
| Warm visual hierarchy, generous whitespace, card shapes, tactile stone/wood cues | Real-world event photos as they become available, text, heading font, exact color values | Invented tournament dates, fictional people/posts, leaderboards, ranks, number-of-wins widgets, LMS progress, non-approved social features |
| Community-focused hero and welcoming tone | Photo composition and crops, decorative Go motifs, motion | Unverified logos, copyrighted third-party UI screenshots used as reusable art, generated pseudo-Hebrew |
| Polished visual style across desktop/mobile | Responsive details and actual grid proportions based on prototypes | Decorative board elements replacing a real functional goban renderer |

## Third-party UX reference
OGS (Online Go Server) is a **behavior/layout reference only** for the board-first game room: central scalable board, player info, optional clocks, move actions, move history, responsive side panels. Do not copy assets/source code/UI wholesale without checking applicable licenses and attribution.

## Image sourcing and production
- Concept art is a communication aid and may be replaced.
- Obtain permission/appropriate licenses for actual images; respect participants' photo consent, especially minors.
- Avoid stock photos impersonating named Go Darom community members.
- Layout needs graceful fallback without photo; use consistent focal position and contrast-safe overlay.
- Generated mockups contain potentially invalid Hebrew text; all website text is to be built in actual React components, with editorial proofreading.

## Cursor handoff
Each screen specification should link to the pertinent reference and identify exactly which parts are normative: component layout, design tokens and interaction states are specified in design docs, while photographic subjects and example event metadata remain replaceable.

## Selected assets — owner decision (supersedes open logo direction)
- Primary identity reference: `../assets/source/BR-REF-002-selected-brand-board.png` — **Logo alternative #2**.
- Primary hero image: `../assets/source/HR-001-selected-hero-original.png` — **Hero alternative #3**.
- Website variants: `../assets/hero/home-hero-desktop.webp`, `../assets/hero/home-hero-mobile.webp`.
- These are exact originals/derivatives, **not images searched by descriptive query**.
- Asset-level approval and vector-logo limitation: `../BRAND_ASSET_SPEC.md`, `../ASSET_MANIFEST.json`.
