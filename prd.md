# OrbitGuard Ops — Collision Avoidance Console

**Status:** v0.1 — static-data prototype
**Target:** responsive, 360px → ultrawide; dark, sustained-attention operations use
**Last updated:** 2026-08-01

---

## 1. Problem

A small-satellite operator flying 4–12 spacecraft receives conjunction data
messages (CDMs) from several tracking networks on different cadences. Each
message is a snapshot of an estimate that is still moving. The operator's job is
not to read probabilities — it is to decide, before a hard deadline, whether to
spend fuel.

Three things make that decision hard, and none of them are solved by a table of
numbers:

1. **The estimate is not stable.** Probability of collision (Pc) for a single
   event routinely moves two orders of magnitude in the 72 hours before time of
   closest approach (TCA), as new tracking data narrows the covariance. A single
   Pc value with no history is close to meaningless. The operator needs to see
   whether the number is rising, decaying, or still too uncertain to act on.
2. **The decision expires before the event does.** A burn needs command upload,
   ground-station contact, and propagation lead time. The last viable moment to
   commit is hours before TCA. Operators routinely discover the window closed
   while they were waiting for one more CDM.
3. **A burn is not free and not local.** Spending delta-v moves the spacecraft
   into a new trajectory that re-screens against the entire catalog. Resolving
   one conjunction frequently creates another, and every burn draws down a
   station-keeping budget that has to last the mission.

## 2. Users

| Role | Uses the console to | Session shape |
|---|---|---|
| **Conjunction analyst** | Triage the screening queue, judge whether an estimate has converged, escalate | Multi-hour, continuous, one screen |
| **Flight director** | Approve or decline a burn against fuel budget and downstream cost | Minutes, decision-focused, arrives at a specific event |
| **Ops engineer** | Confirm tracking sources are current before trusting any of it | Glance, recurring |

All three are looking at the same screen at the same time. The console is a
shared operating picture, not a dashboard per role.

## 3. Product principles

1. **Show the estimate's history, never just its current value.** Every Pc in the
   product is rendered with the trajectory that produced it.
2. **Uncertainty is drawn, not annotated.** Confidence is a band with width, not
   a ± suffix. A wide band is visually loud in exactly the way a wide band should
   be.
3. **The deadline is a wall.** Decision-deadline markers are drawn at the same
   visual weight as the event itself, because missing one is a worse failure than
   misjudging a Pc.
4. **Color carries state, nothing else.** Green, amber, and red never decorate.
   If an element is red, the operator must act on it.
5. **Density over navigation.** An operator should not click to compare two
   conjunctions. Whitespace separates functional groups; it does not pad rows.

## 4. Design system

### 4.1 Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0F14` | Canvas |
| `--panel` | `#141A21` | Elevated panels, rails, strips |
| `--panel-alt` | `#0F151B` | Recessed wells, table zebra |
| `--border` | `#1F2933` | All borders, 1px, always |

Elevation is expressed by surface value and a 1px border. **No drop shadows, no
glows, no gradients anywhere in the product**, including charts.

### 4.2 Type

- **Inter** — all UI text, labels, prose.
- **IBM Plex Mono** — every numeral, identifier, timestamp, and data readout,
  with `font-variant-numeric: tabular-nums` so live-updating values do not
  reflow or jitter.

Scale, fixed at five steps:

| px | Role |
|---|---|
| 11 | Micro-labels, axis ticks, uppercase section eyebrows (0.08em tracking) |
| 13 | Secondary text, table cells, row metadata |
| 15 | Primary body, row titles |
| 20 | Panel-level values, section headings |
| 28 | Primary readouts, page titles |

Text colors: `#E6EDF3` primary, `#8B949E` secondary, `#6E7681` tertiary.

### 4.3 Accent and status

`#4DD4E8` — desaturated cyan. **Interactive and selected states only.** Focus
rings, the selected row, the active rail item, hovered controls. It never
indicates severity and never appears in a chart series.

Status, applied strictly:

| Token | Value | Meaning |
|---|---|---|
| Nominal | `#3FB950` | Pc below action threshold; source current |
| Caution | `#D29922` | Pc above screening threshold, below action; source aging |
| Critical | `#F85149` | Pc above action threshold, or decision deadline inside 6h |

### 4.4 Geometry

- 8px spacing grid. All padding, gaps, and panel dimensions are multiples of 8.
- Corner radius: 4px maximum, 2px on dense controls, 0 on full-bleed strips.
- 40px top status strip: mission identity, UTC clock, system state, alert count.

**Responsive behavior.** The console is designed at desktop density and adapts
down without losing information:

| Breakpoint | Navigation | Console | Source strip |
|---|---|---|---|
| `xl` 1280+ | 56px left icon rail | Three panes side by side, 376 / fluid / 400; each scrolls internally, shell pinned to viewport | Six across, 72px |
| `lg` 1024 | 56px bottom bar with labels | Segmented control swaps Queue / Timeline / Planner | Six across |
| `sm` 640 | Bottom bar | Segmented control | Three across |
| `< 640` | Bottom bar | Segmented control | Two across |

Below `xl` the document scrolls rather than the panes. Selection carries across
panes, so choosing an event in the queue leaves it selected in the planner.

Charts draw in **real pixels against a measured container width** rather than
scaling a fixed viewBox. A narrow screen buys less time resolution, never
smaller type — an 11px axis label is 11px on a phone. Below ~760px the timeline
moves its lane labels from a left gutter into a header row inside a taller lane;
below ~640px the campaign chart drops to three decade gridlines and four hour
ticks. Tables scroll horizontally inside their panel.

### 4.5 Charts

1.5px strokes, `vector-effect: non-scaling-stroke`. No gradients, no shadows, no
glows, no rounded caps on data lines. Confidence bands are flat fills at 14%
alpha of the series' status color. Grid lines are `#1F2933` at 1px. Axis labels
are 11px mono.

## 5. Screens

### 5.1 Console — `/` (primary screen)

The screen an operator leaves open. Four regions inside the rail and strips.

**Center — probability-of-collision timeline.**
The centerpiece. A shared absolute UTC time axis spanning **now −12h to now
+72h**. Each active conjunction occupies its own horizontal lane, 56px tall,
running left to right and terminating at that event's TCA.

Within a lane:

- Pc is plotted on a log scale, 1×10⁻⁷ (lane floor) to 1×10⁻² (lane ceiling).
- The **observed** segment — from first screening up to now — is a solid 1.5px
  line in the event's status color.
- Around it, a **confidence band** at ±1σ in log space. The band is widest at
  first screening and narrows toward TCA as tracking data accumulates. This is
  the chart's whole argument: the reader watches the estimate tighten.
- The **projected** segment — now to TCA — is the same line dashed, with the band
  continuing to narrow to its expected value at TCA.
- A **decision-deadline marker**: a vertical rule with a flag, after which a burn
  is no longer viable for that event. Past the marker the lane's remaining
  interval is drawn in a recessed fill to show the window has closed.
- A **TCA terminator** at the lane's right end.
- A dotted reference line at the 1×10⁻⁴ action threshold.

One vertical **NOW** rule crosses every lane. Lanes are ordered by TCA ascending.
Clicking a lane selects that conjunction and drives both side panels.

**Left panel — active conjunction queue (376px).**
Ranked list, most actionable first. Each row: secondary object designation and
NORAD ID, countdown to TCA (`T−HH:MM:SS`, live), miss distance in km, and current
Pc in scientific notation. A 2px status bar on the row's leading edge. The
selected row is marked with the accent.

**Right panel — maneuver planner (400px).**
Scoped to the selected conjunction.

- Proposed burn: delta-v in m/s, burn direction, execution time, propellant cost.
- Resulting Pc and miss distance after the burn, against the current values.
- **Station-keeping budget** as a depleting bar: remaining propellant, the
  segment this burn would consume, and the reserve required for the rest of the
  mission. If the burn crosses into reserve, the bar goes critical.
- **Downstream conjunctions**: every event this burn would resolve, create, or
  worsen, each with Pc before and after. This is the panel's most important
  content and the reason a burn is never evaluated alone.
- Commit control, disabled once the decision deadline has passed.

**Bottom strip — source freshness (72px).**
One cell per tracking network: name, age since last update, and cadence. Status
is derived from age against expected cadence, not from an absolute clock.

### 5.2 Conjunctions — `/conjunctions`

Full screening queue as a dense sortable table, including events below the
console's display threshold. Columns: ID, primary, secondary, TCA, countdown,
miss distance, radial/in-track/cross-track components, relative velocity, Pc, Pc
trend, source, last update. Row click → detail.

### 5.3 Conjunction detail — `/conjunctions/[id]`

Single-event deep dive: full-width Pc history chart with every CDM as a plotted
observation, the encounter geometry broken into RIC components, the complete CDM
record, and the maneuver options considered for this event.

### 5.4 Fleet — `/fleet`

Per-spacecraft state: orbit, propellant remaining against capacity, delta-v
budget, active conjunction count, and maneuver history. Row click → detail.

### 5.5 Maneuvers — `/maneuvers`

Log of planned, committed, executed, and declined burns with delta-v, propellant,
the conjunction that motivated each, and the downstream events each produced.
Filterable by status.

### 5.6 Maneuver detail — `/maneuvers/[id]`

One burn: delta-v, axis, duration, propellant, execution and upload times, the Pc
it moved and by how much, the propellant budget it draws against, and the full
downstream screening. Historical burns reference conjunctions that have since
cleared — those degrade to the record itself rather than breaking, and say so.

### 5.7 Catalog — `/catalog`

Tracked object catalog: NORAD ID, designation, object type, RCS, orbit class, and
how many active conjunctions each object contributes. Filterable by name, NORAD,
or origin.

### 5.8 Catalog object detail — `/catalog/[norad]`

One tracked object: orbit, radar cross-section, breakup origin, and every active
conjunction it drives against the fleet. An uncharacterized object says plainly
that its area-to-mass ratio is unmodelled, which is the reason its Pc estimates
carry a wide band.

### 5.9 Sources — `/sources`

Expanded tracking-network health: cadence, last update, object coverage,
observation counts, and update history per network.

### 5.10 Source detail — `/sources/[id]`

One network: freshness against its own cadence, coverage, observation volume,
what kind of sensor it is and what that implies for the estimates it feeds, and
every conjunction currently screened from it.

### 5.11 Settings — `/settings`

Screening and alert thresholds: Pc action threshold, Pc screening floor, miss
distance floor, decision lead time, and per-network trust weighting.

### 5.12 Not found — any unresolved record

Unknown conjunction, spacecraft, burn, object, or network IDs land on a styled
404 that explains the scenario is static, rather than the framework default.

### 5.13 Cross-linking

No identifier in the product is a dead end. Every table row opens its own record,
and every detail page links the entities it names — a conjunction reaches its
spacecraft, its catalogued secondary, its screening network, and any burns logged
against it; a burn reaches its conjunction and spacecraft; an object and a network
each reach the conjunctions they are involved in. The command palette indexes all
five record types alongside the seven destinations.

## 6. Motion

Motion is used to preserve continuity, never to draw attention.

| Element | Behavior | Duration |
|---|---|---|
| Route change | Fade + 4px rise | 180ms, `easeOut` |
| Panel mount | Staggered fade-up, 24ms apart | 220ms |
| Chart lanes | Line draws left to right on mount, band fades in behind | 520ms, staggered 40ms |
| Row selection | Shared-layout accent bar slides between rows | 180ms |
| Budget bar | Width interpolates on value change | 320ms |
| Countdowns | No animation — tabular mono, no reflow | — |

All motion is suppressed under `prefers-reduced-motion: reduce`.

## 7. Data

The prototype ships **static data only** — no API, no database, no network calls.

- A fixed `SCENARIO_EPOCH` anchors the scenario. The mission clock starts there on
  mount and ticks in real time, so countdowns and the UTC clock run live while the
  underlying data stays deterministic. Server and first client render agree
  exactly, so there is no hydration mismatch.
- 6 spacecraft, 7 active conjunctions, 6 tracking networks, a maneuver log, and a
  catalog slice.
- Each conjunction carries a Pc series of `[hours before TCA, Pc, σ in log10]`
  samples spanning the full 72-hour screening window. Samples at or before the
  current mission time are observed; the rest are projected.

Replacing the static modules with a fetch layer is the intended next step; no
component reads anything but typed data from `lib/data/`.

## 7a. Models

Everything the detail pages report about orbits, perturbations, and burns is
computed in `lib/astro.ts` from published formulations rather than authored as a
number. Inputs are the catalogued apsides, inclination, and the spacecraft's
propulsion parameters; outputs are derived on render.

| Model | Used for |
|---|---|
| Two-body geometry, vis-viva | Semi-major axis, eccentricity, period, mean motion, apsidal velocities |
| J2 secular rates | Nodal regression Ω̇, apsidal rotation ω̇, sun-synchronous detection |
| Gauss's variational equations | Δa, Δe, Δi produced by an impulsive burn in the RIC frame |
| Clohessy–Wiltshire | Secular along-track drift, Δx = 3·Δv·t — why lead time buys miss distance |
| B-plane projection | How much of that drift actually becomes separation rather than a timing shift |
| Tsiolkovsky | Propellant per burn, Δv capability remaining, avoidance burns affordable |
| Finite-burn timing | Burn duration t = m·Δv/F, and whether the impulsive approximation holds |
| RCS-inferred mass, ballistic coefficient | Drag response, and why small debris carries the widest covariance |

Constants are WGS-84: μ = 398600.4418 km³/s², R⊕ = 6378.137 km, J2 =
1.08262668×10⁻³, g₀ = 9.80665 m/s².

Two consequences are load-bearing for the product. First, an in-track burn does
not move the spacecraft when it fires — it changes the period, and separation
accumulates linearly, so **lead time is worth more than delta-v** and the
decision deadline is the real constraint. Second, only the component of that
displacement perpendicular to the relative velocity lies in the encounter plane;
for a near-head-on conjunction most of a large along-track drift changes arrival
time rather than miss distance.

Every value returned by `lib/astro.ts` is quantised before it leaves the module.
`Math.sqrt`/`log`/`exp`/`cos` are only implementation-precise, so an unrounded
result can differ between Node and the browser in its last bits — enough to cause
a hydration mismatch once rendered as text.

Screening configuration in Settings exposes the standard choices: Pc formulation
(Foster 2-D, Chan, Alfano 2005, Monte Carlo), hard-body radius policy, covariance
scaling, dilution handling, propagation theory and force model (geopotential
degree/order, NRLMSISE-00 / JB2008 / Harris-Priester, SRP, third-body), the RIC
screening volume, and maneuver policy.

## 8. Out of scope for v0.1

- Real CDM ingest, Space-Track or commercial provider integration.
- Actual orbit propagation. Post-burn Pc and downstream conjunctions are authored
  values, not computed ones.
- Command upload, ground-station scheduling, or anything that touches a
  spacecraft.
- Authentication, multi-tenancy, audit trail.
- Touch-specific interactions. The layout is responsive to phone widths, but
  gestures, long-press, and hit-target tuning for gloved or one-handed use are
  not addressed.

## 9. Success criteria

1. An analyst can tell, without clicking, which of seven events has a rising
   estimate and which has a converging one.
2. Time remaining to a decision deadline is readable at a glance from across a
   room.
3. No burn can be committed without the downstream consequences visible on the
   same screen.
4. The console runs for an eight-hour shift without a layout shift, a jitter in a
   numeral, or a color used decoratively.
5. Every screen is usable at 360px wide, with axis labels and numerals at their
   authored size rather than scaled down.
