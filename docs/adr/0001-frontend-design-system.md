# ADR-0001: Frontend Design System Migration to shadcn/ui + Tailwind

**Date:** 2026-05-04
**Status:** Accepted
**Decision drivers:** Visual modernization, BigTech baseline, brand identity, dark mode, a11y

## Context

The existing frontend is React 19 (Vite) with **MUI 6 + Tailwind 4 cohabitation**, ~99 jsx files spanning 5 role folders (Admin 6, Organizer 12, Participant 30, PublicUser 12, Homepages 11) and 5 root-level pages. The visual identity is generic Tailwind blue/purple defaults, no dark mode, scattered alert() / Snackbar patterns, inconsistent spacing, hard-coded hex colors in dashboards.

A token system (`src/theme/tokens.js`) was added in the prior architectural pass but adoption is incomplete.

The goal: bring the UI to **BigTech (Linear / Vercel / Notion AI / GitHub)** baseline while preserving 100% of existing behavior and using `Indigo` as a distinctive brand vector for the competition / hackathon domain.

## Decision

Migrate the entire frontend from MUI to **shadcn/ui (Radix Primitives + Tailwind)** in 8 phases, following the design vector locked in the grill-with-docs session.

### 12 design decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Stack | Full shadcn/Radix + Tailwind native (drop MUI) |
| 2 | Visual direction | Hybrid — Vibrant (Devpost-style) for public pages + Data-dense (Linear/Kaggle) for app pages |
| 3 | Layout shell (app) | Collapsible sidebar + topbar; drawer on mobile |
| 4 | Density | 3-tier per scenario — Comfortable (public/forms), Regular (default), Compact (data tables) |
| 5 | Brand color | **Indigo `#6366F1`**; slate neutrals; emerald success / amber warn / red error / sky info |
| 6 | Typography | **Inter** (UI/body) + **Cal Sans** (hero h1 only) + **JetBrains Mono** (IDs/scores/code) |
| 7 | Dark mode | Yes — system preference + manual toggle, CSS variables per shadcn convention |
| 8 | Motion | framer-motion baseline — page fade 150ms / card hover lift 200ms / modal scale-in 180ms; respect `prefers-reduced-motion` |
| 9 | Page priority | Shell → Auth → Public → Participant → Organizer → Judge → Admin |
| 10 | Cadence | 8 phases over multiple sessions; foundation in session 1 |
| 11 | A11y target | WCAG AA (≥4.5:1 contrast, visible focus rings, skip-to-content, labels always visible) |
| 12 | Imagery | Lottie + abstract gradients for hero; lucide-react icons + monochrome SVGs for empty states; deterministic avatar / cover gradients |

### Implicit decisions (locked)

| Concern | Choice |
|---------|--------|
| Icon library | **lucide-react** (replaces material-icons + react-icons) |
| Toast / notification | **sonner** (replaces MUI Snackbar) |
| Table | **TanStack Table v8** (replaces MUI x-data-grid) |
| Date picker | **react-day-picker** (replaces MUI x-date-pickers) |
| Modal / Dropdown / Tooltip / Popover / Tabs / Select | **Radix Primitives** (shadcn copy-paste) |
| Charts | Keep **recharts**, restyle with indigo/slate palette |
| Forms | Keep **react-hook-form + zod** |
| Theming engine | **CSS variables + Tailwind config** (drops MUI ThemeProvider) |

### Token system (CSS variables)

Defined in `src/styles/globals.css`:

```css
:root {
  /* Brand */
  --primary: 239 84% 67%;           /* indigo-500 #6366F1 */
  --primary-foreground: 0 0% 100%;

  /* Neutrals (slate) */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 239 84% 67%;

  /* Functional */
  --success: 158 64% 40%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  --info: 199 89% 48%;

  /* Surfaces */
  --card: 0 0% 100%;
  --popover: 0 0% 100%;

  /* Radii */
  --radius: 0.5rem;
}

.dark {
  --background: 222 47% 5%;
  --foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --card: 222 47% 7%;
  --popover: 222 47% 7%;
}
```

### Phase plan

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| 0 | Design ADR + git cleanup | < 1 hr | ✅ |
| 1 | Foundation — globals.css, lib/utils.ts, shadcn primitives, AppShell (Sidebar/Topbar/dark mode toggle), font loading | 4-6 hr | 🚧 |
| 2 | Auth pages (Login/Register/Reset) | 2-3 hr | ⏳ |
| 3 | Public Homepages (vibrant hero, contest cards) | 3-4 hr | ⏳ |
| 4 | Participant pages (30 pages — submission flow, contest browsing, team management) | 8-10 hr | ⏳ |
| 5 | Organizer pages (12 pages — contest CRUD, judge assignment) | 5-6 hr | ⏳ |
| 6 | Judge pages (scoring flows) | 3-4 hr | ⏳ |
| 7 | Admin pages (6 pages — user management, dashboard) | 3-4 hr | ⏳ |
| 8 | Cleanup — remove MUI, remove dual theme, audit a11y, run lighthouse, finalize tokens | 2-3 hr | ⏳ |

**Total estimated effort: 30-40 hr split across multiple sessions.**

### Migration safety

- MUI stays installed during phases 1-7 to avoid breaking unmigrated pages
- New shadcn primitives live in `src/components/ui/` (shadcn convention)
- Per-phase commits, all behind feature parity (no functional change, only visual)
- Existing routes unchanged, so e2e flows continue working throughout
- Dark mode is opt-in per session (localStorage); default light to avoid jarring change

## Consequences

**Positive**
- Distinctive Indigo brand vs generic Tailwind blue
- Dark mode unblocked
- Smaller bundle (~300KB MUI → ~80KB shadcn estimated)
- a11y baseline guaranteed by Radix primitives
- TanStack Table is more flexible than MUI DataGrid (and removes paid Pro feature gate)

**Negative**
- 30-40 hr engineering investment
- Temporary dual stack during migration (MUI + shadcn coexist for ~6 weeks)
- All custom MUI sx={} prop calls need rewriting
- Test snapshots will change wholesale
- @mui/x-tree-view has no perfect replacement — built from Radix Collapsible

**Mitigations**
- Phased migration (per role folder) keeps each PR small
- Reference grid (Linear, Vercel, Notion AI) screenshots in PRs for review
- Visual regression: run `npm run build` per phase, manual smoke test per role
- a11y check via axe-core dev script in Phase 8

## Reversibility

Reversing requires re-introducing MUI components to whatever pages were migrated. Cost grows linearly with phases completed. After Phase 8 (MUI removed), reversal cost is the original migration cost.

## Related

- ADRs to follow: 0002 dark-mode persistence strategy, 0003 chart palette, 0004 image/Lottie strategy
- Tracking issue: refactor/frontend-shadcn-migration
