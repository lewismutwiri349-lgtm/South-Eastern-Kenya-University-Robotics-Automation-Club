# Frontend App Shell

## 1. Feature Overview
The persistent chrome around every public page: global navigation header,
footer, the light/dark theme system, and the global stylesheet. Not a
domain feature — infrastructure every other frontend page depends on.

## 2. Architecture
- `frontend/app/layout.tsx` — the Next.js root layout. Imports
  `app/globals.css`, injects `lib/theme.tsx`'s `themeInitScript` inline in
  `<head>` (sets `data-theme` on `<html>` before first paint, avoiding a
  flash of the wrong theme), wraps `{children}` in `ThemeProvider`, and
  renders `Header`/`Footer` around it.
- `frontend/components/Header.tsx` — sticky nav bar: site mark, links to
  every planned public route (including ones not built yet — About,
  Divisions, Projects, News, Events, Awards, Gallery, Resources, Contact),
  `ThemeToggle`, and a sign-in link.
- `frontend/components/Footer.tsx` — static footer.
- `frontend/lib/theme.tsx` / `frontend/components/ThemeToggle.tsx` — theme
  state via React context, persisted to `localStorage`, toggled via a
  button in the header.
- `frontend/app/globals.css` — CSS custom properties for both themes (per
  `docs/06_UI_Design_System.md`), base typography, `prefers-reduced-motion`
  handling, focus-visible styling.

## 3. API
Not applicable — no backend endpoints. `Header`'s nav links to routes that
don't exist yet (Projects, Events, Awards, Gallery, Resources, Contact)
will 404 until those pages ship; that's expected at this point in the
roadmap, not a bug.

## 4. Database
Not applicable.

## 5. Permissions
Not applicable — the shell itself is unauthenticated. `Header`'s "Sign in"
link points at `/login`, which doesn't exist yet (Identity has no frontend
yet — see `docs/modules/identity-auth.md`).

## 6. Edge Cases Handled
- **Flash of wrong theme** — `themeInitScript` runs synchronously before
  React hydrates, reading `localStorage` (falling back to
  `prefers-color-scheme`) and setting `data-theme` directly, rather than
  waiting for a client-side `useEffect`.
- **`prefers-reduced-motion`** — global CSS rule collapses all animation/
  transition durations to near-zero for users who've requested it.

## 7. Bug Found During Validation
**Found 2026-09-10, while checking About/Divisions against a real DoD** —
every component described above was fully built, but `app/layout.tsx` was
still the Module-0 scaffold stub: `<html><body>{children}</body></html>`,
nothing else. Concretely, every page that had been "shipped" (Home, About,
Divisions, News) was rendering with:
- no `<Header>` or `<Footer>` — no navigation existed anywhere on the site
- no stylesheet — `globals.css` was never imported, so none of the design
  system (colors, type, spacing) was actually applied
- no theme system — `ThemeProvider` was never mounted, so `ThemeToggle`
  (which isn't rendered anywhere anyway, since `Header` wasn't rendered)
  would have thrown (`useTheme must be used within ThemeProvider`) if it
  had been

`curl`-based response-code/content checks (used to validate News rendering
in the previous fix) didn't catch this — they confirmed the right text was
present, not that it was styled or navigable. Fixed by wiring
`layout.tsx` per the "Architecture" section above; re-verified by fetching
the actual compiled CSS output and confirming the nav/footer markup is
present in the rendered HTML, not just a successful build.

## 8. Tests
No automated tests — this is presentational shell with no business logic.
Verified manually (2026-09-10): `next build` clean for all 5 routes;
`next start` + `curl` confirmed real compiled CSS served with the expected
design-system variables, `Header`'s nav markup and `Footer`'s text present
on `/`, `/about`, `/divisions`, and `/news`, and the theme-init
`data-theme` script present in the response HTML.

## 9. Future Improvements
- No automated visual/accessibility regression testing (e.g. Playwright)
  for the shell — would have caught this bug immediately; not built yet
  for the project generally.
- `Header`'s nav links to 6 routes that don't exist yet — expected to
  resolve naturally as later roadmap phases ship, not tracked as individual
  TODOs here.
- No mobile nav treatment yet (the link list will wrap on narrow
  viewports rather than collapsing into a menu).
