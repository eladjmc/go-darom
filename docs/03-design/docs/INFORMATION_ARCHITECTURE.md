# Information Architecture and Navigation

**Status:** DRAFT. URL patterns below are proposed, not product decisions.

## Global structure
- Public discovery shell: consistent brand/header/navigation/footer, content pages indexable by link; accessible without authentication.
- Authenticated member shell: the same site with access to notifications, DMs, directory, game resume, personal area.
- Game room shell: visually focused board-first layout with game-specific actions and expandable side panels.
- Admin shell: protected route within the same React application; server checks every privileged action.
- Login/onboarding modal or dedicated route must preserve safe return-to-intent context; never blindly follow arbitrary external redirect URLs.

## Proposed primary information architecture
| Top-level label (he) | Route family | Public? | Subsections |
|---|---|---|---|
| בית | `/` | Yes | Welcome; next event; weekly puzzle; news; featured guides; gallery teaser; Join/Play CTAs |
| הקהילה | `/community` | Public landing; chat/member directory authenticated | Announcements, events, gallery, members, central chat |
| משחקים | `/play` | Intro public; actual games authenticated | Live invitation flow, async games, Study, personal games |
| לומדים גו | `/learn` | Yes | Guides, videos/lectures, interactive board examples |
| חידות | `/puzzles` | Yes | Weekly featured puzzle, library, solve view |

Supporting destinations: `/events`, `/events/:slug`; `/announcements`, `/announcements/:slug`; `/gallery` and event galleries; `/members`, `/members/:id`; `/chat`, `/messages/:conversationId`; `/games/:gameId`; `/study/:boardId`; `/me` with tab views; `/shop` (**Coming Soon**); `/admin/**`.

### Important distinction
The four-category navigation from the approved visual direction was a **suggestion**; the product's different areas should remain one or two clicks away. Final desktop menu labeling and exact mobile tabs require design validation. Prefer clear Hebrew names over forcing everything into a strict four-item menu.

## Global controls
- Logo returns to home.
- Unauthenticated: Google sign-in/join CTA where needed; reading pages never require auth.
- Authenticated: avatar menu, bell with unread count, chat/DM access, visible active Live indicator with quick return.
- Online indicator in member list reflects active sockets (multiple tabs count as one person).
- Only one active Live game; async games and Study Boards can coexist.
- Active-game indicator stays available on other pages, but never overlays the Go board or blocks important mobile controls.
- Redirect after first sign-in returns to the originally requested action if still valid; show a friendly fallback when the action expired.

## Responsive proposals
- Desktop >= 1024 CSS px: horizontal navigation, content max width approx. 1200–1280 CSS px, independent full-width game layout.
- Tablet 768–1023: compact header, two-column content where appropriate; game side panels collapse.
- Mobile < 768: compact header, discoverable menu, and optional context-aware bottom shortcut bar (subject to design testing); avoid two competing navigation systems.
- Breakpoints are provisional tokens, not strict implementation contracts until UX approval.

## Route/error behaviors
- Direct links to public content work without login.
- Deep link to a member-only resource prompts Google auth and returns to it when authorized.
- Missing or removed content gets a true not-found state; deleted content must not leak private information.
- Suspended users see clear restricted-access messaging; public pages remain visible where appropriate.
- Expired invitations show a concise explanation and a **create new invite** action; never accept stale invitations.
- Browser refresh on game/study route loads latest server snapshot, with reconnect state and pending-command reconciliation.
