# 06 — UI Design System

This document defines the visual and interaction language for the entire
platform. Concrete design tokens (exact hex values, exact pixel scale) are
finalized when the frontend scaffolding module starts and a first component
is built against them — this document sets the *rules* those tokens must
follow, so visual decisions aren't made ad hoc per page.

## 1. Design Principles
- **Consistency over novelty.** A button looks and behaves the same in the
  Admin dashboard as it does on the public site.
- **Clarity over decoration.** This is an engineering tool — dense
  information (project lists, dashboards, tables) must stay legible.
- **Every interactive element has a visible state** for default, hover,
  focus, active, and disabled — no exceptions.

## 2. Spacing
- Spacing scale is a fixed set of steps (e.g. 4px base unit: 4/8/12/16/24/
  32/48/64), never arbitrary pixel values chosen per component.
- Consistent spacing scale used for padding, margin, and gap across every
  component — defined once in the frontend's Tailwind config (or equivalent
  token file) when scaffolding begins.

## 3. Typography
- One type scale, limited set of sizes (e.g. xs/sm/base/lg/xl/2xl/3xl/4xl).
- One primary typeface for UI text, optionally a distinct one for headings
  if it reinforces the engineering/technical brand — decided at scaffolding
  time, not per page.
- Line height and font weight are part of the scale, not chosen freely per
  instance.

## 4. Color System
- A defined palette: primary, secondary, neutral/gray scale, and semantic
  colors (success, warning, error, info) — each with enough shades for
  backgrounds, borders, and text at sufficient contrast.
- Role-based accents are allowed for dashboards (e.g. Admin vs Leadership
  vs Member portal each having a subtle accent) but share the same base
  palette — no per-portal color systems invented independently.

## 5. Components (shared, not duplicated per page)
- **Cards** — one base card component with defined padding, radius, and
  shadow, reused for project cards, news cards, event cards, award cards.
- **Buttons** — a fixed set of variants (primary, secondary, destructive,
  ghost) and sizes — no one-off button styles.
- **Radius & Shadow** — a fixed scale (e.g. sm/md/lg radius; sm/md/lg
  shadow), applied consistently by component type, not per instance.

## 6. Dashboard Layouts
- Admin, Leadership, and Member dashboards share one layout shell
  (sidebar/topbar + content area component), differing only in nav items
  shown per role — not three independently built layouts.
- Data-dense views (user tables, project moderation queues) use a shared
  table component with consistent sorting/filtering/pagination patterns.

## 7. States That Must Always Be Designed
Every view that loads data or accepts input must explicitly handle:
- **Loading state** — skeleton or spinner, never a blank screen
- **Empty state** — a designed message + relevant call-to-action, never a
  blank list
- **Error state** — a clear, actionable message, never a raw error dump
- **Success/confirmation state** — for actions like form submission,
  upload completion, approval actions

## 8. Animation
- Motion is used to communicate state change (loading, transition,
  success), not decoration. Durations stay short (~150–250ms) so the UI
  feels responsive, not sluggish.
- Respect `prefers-reduced-motion` — animations are disabled/reduced for
  users who request it.

## 9. Accessibility Baseline
- Minimum WCAG AA color contrast on all text.
- All interactive elements are keyboard-navigable with a visible focus
  ring.
- All images/icons carry appropriate `alt` text or `aria-hidden` if purely
  decorative.
- Forms have properly associated labels, not placeholder-only labeling.

## 10. Enforcement
Any new UI component is checked against this document before merge. A
component that introduces a new spacing value, color, or button style
outside the defined system requires an explicit, documented reason —
it's a signal the system itself may need to evolve, not that this instance
should quietly diverge from it.
