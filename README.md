# OrbitGuard Ops

Collision-avoidance console for small satellite fleets. Conjunction screening,
probability-of-collision trending, and maneuver planning against a station-keeping
budget. Next.js App Router, deployed on Vercel.

See [`prd.md`](prd.md) for the product spec and the full design system.

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 |
| Styling | Tailwind CSS 3 |
| Motion | Framer Motion |
| Icons | lucide-react |
| Charts | Hand-rolled SVG — no chart library |
| Testing | Playwright (Chromium, WebKit, Pixel 5, iPhone 13) |
| Telemetry | `@vercel/analytics` · `@vercel/speed-insights` |

## Getting started

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm test           # Playwright e2e (boots its own dev server)
```

## Layout

```
app/
  page.tsx                  Console — queue + timeline + planner + source strip
  conjunctions/             Screening queue, and [id] per-event detail
  fleet/                    Spacecraft list, and [id] per-spacecraft detail
  maneuvers/                Burn log, and [id] per-burn detail
  catalog/                  Object catalog, and [norad] per-object detail
  sources/                  Network health, and [id] per-network detail
  settings/                 Thresholds and lead times
  not-found.tsx             Styled 404 for unresolved record IDs
components/
  shell/                    Icon rail, status strip, command palette, app shell
  console/                  Timeline, campaign chart, queue, planner, source strip
  ui/                       Panel, Field, Table, BudgetBar, readouts
lib/
  data/                     All static scenario data (see below)
  format.ts                 Pc math, severity, countdown and unit formatting
  mission-clock.tsx         Ticking clock anchored to the scenario epoch
```

## Data

Static only — no API, no database, no network calls.

`lib/data/` holds 6 spacecraft, 8 active conjunctions, 6 tracking networks, a
maneuver log, and a catalog slice. Every conjunction carries a `pcSeries` of
`[hours before TCA, Pc, σ in decades]` samples spanning the full 72-hour
screening campaign; samples at or before the current mission time are observed,
the rest are the projection.

A fixed `SCENARIO_EPOCH` anchors everything. The mission clock starts there on
mount and advances in real time, so countdowns and the UTC readout tick live
while the data stays deterministic. The server renders at exactly the epoch and
so does the client's first render, so hydration matches to the millisecond.

Swapping these modules for a fetch layer is the intended next step — no
component reads anything but typed data from `lib/data/`.

## Cross-linking

No identifier is a dead end. Every table row opens its own record, and every
detail page links the entities it names — a conjunction reaches its spacecraft,
its catalogued secondary, its screening network, and any burns logged against
it. The `RefLink` component marks these; the e2e suite crawls every internal
link and fails if any resolves to the 404 boundary.

Conjunctions carry a `sourceId` rather than a source display string, so the link
to a tracking network is a real reference the data model can validate.

## Design system

Dark operations console, tuned for sustained attention. Background `#0B0F14`,
panels `#141A21`, 1px `#1F2933` borders. Inter for UI text, IBM Plex Mono with
tabular figures for every numeral, on a fixed 11/13/15/20/28px scale. `#4DD4E8`
is reserved for interactive and selected states; `#3FB950` / `#D29922` /
`#F85149` carry status and never decorate. 8px spacing grid, 4px maximum radius.

**Two material families, kept strictly apart.** Data surfaces — panels, tables,
the charts — are flat fills with 1px borders and no blur, gradient, or shadow.
Chrome and overlays — the rail, the status strip, the command palette, chart
tooltips — use Apple-style glass: translucent, backdrop-blurred and saturated,
with a specular top edge rendered as an inset highlight rather than a drop
shadow. Nothing casts a shadow onto anything else. Glass never sits behind a
number, because that would make a probability's contrast depend on whatever is
scrolling underneath it.

## Charts

Both charts are hand-drawn SVG at 1.5px strokes with no gradients, shadows, or
glows. They draw in **real pixels against a measured container width**, so a
narrow screen buys less time resolution rather than smaller type — an 11px axis
label is 11px on a phone.

- **Console timeline** — one lane per conjunction on a shared now −12h → +72h
  axis, terminating at each event's TCA. Pc on a five-decade log scale with a
  ±1σ band that narrows as tracking data accumulates, a dashed projection past
  now, a decision-deadline rule, and a recessed fill over the interval where a
  burn is no longer viable. Lanes grow to fill the panel height.
- **Campaign chart** (event detail) — the same grammar for a single event, with
  every CDM plotted as its own observation.

## Responsive

| Breakpoint | Navigation | Console |
|---|---|---|
| `xl` 1280+ | 56px left icon rail | Three panes side by side; shell pinned to viewport, panes scroll internally |
| below `xl` | Bottom bar with labels | Segmented control swaps Queue / Timeline / Planner; document scrolls |

Selection carries across panes. Tables scroll horizontally inside their panel.
Below ~760px the timeline moves lane labels from a left gutter into a header row
inside a taller lane.

## Motion

Route changes fade and rise 4px. Panels stagger in at 24ms. Chart lines draw
left to right on mount with the band fading in behind. Row selection slides a
shared-layout accent bar. Countdowns never animate — tabular mono, no reflow.
All of it is suppressed under `prefers-reduced-motion: reduce`.

## Agent skills

Nine Vercel skills from [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills)
are installed and pinned in `skills-lock.json`. See [`.agents/README.md`](.agents/README.md).

## Deploying

`vercel.json` pins the framework to `nextjs`. Run `npx vercel` for a preview and
`npx vercel --prod` to promote.
