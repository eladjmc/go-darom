# M2 Manual Visual QA Checklist

Use while `npm run dev:web` + `npm run dev:api` are running.

## URLs

| Page | URL |
|---|---|
| Home | http://localhost:5173/ |
| Shop Coming Soon | http://localhost:5173/shop |
| Sign-in | http://localhost:5173/sign-in |
| Onboarding | http://localhost:5173/onboarding |
| My area | http://localhost:5173/me |
| Members | http://localhost:5173/members |
| Admin shell | http://localhost:5173/admin |
| Health | http://localhost:4000/health |
| Dev board (not product) | http://localhost:5173/dev/goban-poc |

## Breakpoints

Check each item at **360, 390, 768, 1024, 1440** CSS px (DevTools).

- [ ] Header brand + nav readable; mobile menu toggles
- [ ] Home hero: selected photo (not mirrored); Hebrew DOM headline/CTAs
- [ ] Hero layout: text on inline-start; image uses left open space without flip
- [ ] Feature cards / empty teasers stack cleanly on mobile
- [ ] Focus-visible rings on buttons/links
- [ ] `prefers-reduced-motion: reduce` — no jarring motion
- [ ] Provisional logo noted; text brand `גו דרום` present
- [ ] Shop page shows Coming Soon empty art + Hebrew copy
- [ ] Loading / empty / error states readable (members empty, admin denied)

## Auth (stub or Clerk)

With `IDENTITY_DEV_STUB=true` / `VITE_IDENTITY_DEV_STUB=true`:

- [ ] התחברות creates session and routes to onboarding if needed
- [ ] Nickname confirm completes; return intent honored when set
- [ ] `/members` lists onboarded users; presence updates when socket connected
- [ ] Non-admin `/admin` shows denial from API

With real Clerk keys (Google-only):

- [ ] Google sign-in works; same onboarding/return-intent path
