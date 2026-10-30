# Homepage Hero — Visual Specification (M2 revision)

**Status:** Binding for the M2 visual QA fix (2026-10-30, HR-001c). Elaborates brand/UX drafts; does not change Product Baseline.  
**Assets:** Hero `HR-001` original; RTL flip `HR-001b`; current homepage **`HR-001c`** (`home-hero-minimal-natural.webp`, board left / open right, no plate shadow). Logo concept #2 provisional.  
**Rule:** Do not substitute unrelated art. Homepage desktop uses **HR-001c** (owner-provided). Do not invent mirrors.

## Desktop composition (HR-001c)

Owner provided a minimal natural plate: **board left / open right**, no outer shadow (`HR-001c`).

- Full-bleed photo: `home-hero-minimal-natural.webp`.
- Copy overlays the open right of the photo (no cream scoop panel); RTL inset (~230px right on wide desktop).
- No hard vertical seam, inset borders, or gray rules.
- Transition: soft bottom gradient on `.hero-stage` using exact `var(--canvas)` (`#faf7f0`), under the copy panel. Community section uses the same canvas and tucks slightly into the fade. No divider wave, gray veil, or dark shadow. Mobile uses a shorter fade on the photo strip.

## Header (desktop)

Full-width bar with horizontal padding (not a narrow floating cluster):

1. **Far right (inline-start):** brand / logo.
2. **Center-right:** main nav links, compact, with subtle active underline.
3. **Far left (inline-end):** Google sign-in or authenticated controls.

## Desktop hero (≥900px)

1. Full-bleed under sticky header; min-height ~`min(68vh, 620px)`.
2. Split composition as above; content is one coherent RTL block (eyebrow → H1 → lede → primary → secondary).
3. Headline `לומדים. משחקים. נפגשים.` with intentional wrapping; avoid ultra-narrow `ch` caps.
4. Primary CTA `הצטרפו לקהילה`; secondary `למפגשים הקרובים` only (no duplicate Google in hero — auth lives in header/drawer).
5. Transition: soft bottom fade + sparse divider into “מה מחכה בקהילה”.

## Mobile (≤899px), especially 360 / 390 / 430 (+ short height)

Order:

1. Compact header  
2. Eyebrow `קהילת גו בדרום`  
3. Headline  
4. Short lede  
5. Primary CTA  
6. Short cropped board image  
7. Secondary `למפגשים הקרובים` only if useful  

Image band capped (~160–200px). No horizontal overflow; no gray separators.

## Mobile navigation drawer

- Opens from **inline-start** (physical **right** in RTL).
- `100dvh` × `min(85vw, 360px)`; flush to top / inline-start / bottom; safe-area insets.
- Dimmed backdrop; z-index above header/hero.
- Header: brand + close; compact nav rows; auth in drawer footer.
- Close: X, Escape, backdrop, route change; lock body scroll; restore focus; respect `prefers-reduced-motion`.

## Copy (limited)

Preserve headline and temporary lede. Primary / secondary CTAs as above. No return of `לגלות את גו`. Full UX writing pass is out of scope.

## Acceptance for this pass

- Desktop: right content panel + left board visual; no gray seam.
- Mobile hero + drawer polished; screenshots at 1440 / 1920 / 360 / 390 / 430 + open drawer.
- Quality gates run; **no M2 visual approval / no M3** until owner confirms.
