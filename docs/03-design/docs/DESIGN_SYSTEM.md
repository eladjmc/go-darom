# Design System — Proposed Visual Baseline

**Status:** DRAFT. Layout direction approved by owner/team; exact numeric tokens below are recommendations pending visual review.

## Visual signature
**Warm Editorial Go Club**: creamy surfaces, natural wood, sage and forest greens, deep charcoal text, intentional whitespace, high quality photos of real Go boards/stones, tactile yet restrained surfaces. Design should feel contemporary and thoughtfully crafted, not like a generic SaaS dashboard.

### Proposed palette (needs approval)
| Role | Proposed value | Use |
|---|---|---|
| Canvas | `#FAF7F0` | Main public page background |
| Surface | `#FFFFFF` | Cards, menus, dialogs |
| Surface warm | `#F2EBDD` | Alternate section blocks |
| Brand primary | `#315C49` | Primary CTAs, headings, active nav |
| Brand hover | `#254838` | Hover/pressed primary controls |
| Sage | `#91A994` | Supporting illustration accents |
| Wood accent | `#C89E69` | Go motif, separators, select badges |
| Charcoal | `#252925` | Body copy |
| Muted text | `#616B62` | Secondary text, timestamps |
| Border | `#DEE3DB` | Card edges, dividers |
| Error | `#B6453D` | Errors, destructive actions |
| Success | `#276946` | Confirmation and game actions |

Values are proposed tokens, not color samples to copy mechanically from AI-generated moodboards; verify actual contrast using rendered UI.

## Typography
- Hebrew-first font stack: prefer locally available/open-licensed web fonts such as Heebo for body; explore a distinct high-quality Hebrew display face for headings only if licensing/performance support it. No bundled fonts without license verification.
- Body baseline approx. 16px, comfortable 1.5–1.65 line-height; mobile same or larger for interactive content.
- Headings use noticeable hierarchy, 700/600 weights; never rely solely on size/color for state.
- Numbers in Go boards, clocks and coordinates can use tabular numerals; keep coordinates and SGF labels readable in LTR micro-contexts.
- Limit dense paragraph width around 65–75 characters where feasible; allow wider tables/cards when necessary.

## Surfaces and layout
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px; page gutters approx. 16–20px mobile, 32–48px desktop.
- Radius: small inputs 10px, cards 16–20px, large hero panels 24–28px; do not make Go board intersections visually rounded.
- Shadows: low-contrast ambient shadow + thin subtle border. Reserve stronger elevation for overlays and hover.
- Visual motifs: partial go-board grid, gently offset black/white stones, bowls and woodgrain, occasional abstract regional landscape cues; keep art out of functional board regions.
- Editorial photo crop with soft warmth; avoid fake-looking staged player portraits or stock imagery that implies real club members.

## Component vocabulary
- Header, responsive navigation, footer, hero, content cards, list cards, filters/search, user card, presence status, notification bell/popover, invitation toast, dialogs, tabs, chips, buttons, form fields, upload controls, media grid/lightbox, admin data tables, game player info, move history, game action bar, study toolbar, puzzle feedback.
- Design all components in default, hover, focus-visible, pressed, disabled, loading, error and empty state when relevant.
- CTA hierarchy: one visually dominant primary action per region; secondary outline; tertiary text. Destructive actions separated spatially and require confirmation for high-impact effects.
- Toasts: informative and interrupt-light, actionable for invitations; public chat does not create a toast for every message.
- Use native semantics and keyboard navigation for forms; do not rely on decorative icon-only controls without accessible labels.

## Imagery and original identity
- Source images may be replaced later without layout changes; define per-module crop/aspect and fallback in screen specs.
- Homepage hero: lifestyle/documentary or artistic Go-board imagery with text legibility overlay.
- Events/gallery: eventually use real community photos with consent; placeholders must be clearly demonstrative.
- Learning: tight Go technique shots and board diagrams.
- Puzzles/game room: actual programmatic goban renderer, never decorative photos as the playable board.
- Gallery images require optimized responsive sizes, captions/alt text, and loading strategies.

## Selected brand direction and asset readiness
- Owner selected **Logo option #2** (circular wood/go stones/sun/southern landscape) and **Hero option #3** (angled board on right, open left). Source files and asset IDs are in `../BRAND_ASSET_SPEC.md` and `../ASSET_MANIFEST.json`.
- Selection approves the **direction/source image**, not yet the vector master, crop fidelity, finalized colors or screen implementation. Avoid invented pseudo-Hebrew; final SVG wordmark must be manually verified.

## Design QA
At 360/390/768/1024/1440px test full RTL, readable content, navigation, dialog overflow, tap targets and photography crops; compare screenshots to approved references but treat functional spec as authoritative.
