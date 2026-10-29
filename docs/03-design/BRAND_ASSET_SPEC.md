# Go Darom — Brand & Asset Baseline v0.2

**Status:** DRAFT FOR ASSET QA. Owner selected **Logo alternative 2** and **Hero alternative 3**. Other assets are production proposals, not owner approvals.

## Exact source mapping
- Logo #2 selected original: `assets/source/BR-REF-002-selected-brand-board.png` (generated brand BOARD).
- Hero #3 selected original: `assets/source/HR-001-selected-hero-original.png`.
- Source art must not be replaced with unrelated image searches or regenerated approximations.

## Deliverables available NOW
- Original selected sources in `assets/source/`; cropped raster identity references in `assets/brand/`.
- Responsive WebP derivatives in `assets/hero/` (1600x900 desktop, 900x1200 mobile), retaining the selected image.
- 6 original scalable SVG Go feature icons, 2 SVG decorations, and 6 SVG empty states.
- `ASSET_MANIFEST.json` contains stable paths, IDs, approval status and intended use.

## Identity limitation / release gate
The approved **logo concept is a raster brand-board image**, not a layered SVG. Automatic raster tracing can damage Hebrew typography and geometric precision. The included logo crops are **references, not finished transparent/vector master logos**. Before public launch, manually rebuild the selected mark + Hebrew wordmark in vector, proofread `גו דרום` and `קהילת גו בדרום`, produce transparent SVG horizontal/stacked/monochrome variants, and derive SVG/PNG favicons. Do not present the custom UI icons as the brand mark.

## Frontend contract
- Web hero contains **no app copy**; place actual Hebrew text, buttons and overlays in accessible React DOM.
- RTL note: selected hero is mostly open on the **left**; in RTL home layouts headline normally appears on the **right**. Prototypes must intentionally resolve this mismatch (e.g., desktop hero as a separate adjacent panel, CSS position/crop, or layout reversal). **Do not horizontally mirror the Go photograph** without explicit visual approval.
- For mobile, reserve text in its own region above or below the image. Verify 360, 390, 768, 1024, 1440px.
- Use `loading=lazy` only for below-fold imagery; optimize LCP preload for actual above-fold hero if needed.
- Functional Goban must be engine-driven, never represented by photos/illustrations.
- Existing UI icons continue to use Lucide React; original Go icons are supplemental.
- Use decorative icons with empty accessible label when adjacent text communicates the same information; interactive controls need `aria-label` in Hebrew.
- Colors and font specifications remain from `docs/DESIGN_SYSTEM.md`, proposed until rendered visual QA.

## Rights and identity
The selected images were generated for this project; preserve source provenance in the manifest. They do not depict actual community events or people. Real event galleries require consent. No font files included.
