"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Conjunction } from "@/lib/data";
import { PC_ACTION_THRESHOLD } from "@/lib/data";
import {
  conjunctionSeverity,
  currentSample,
  elapsedHours,
  formatCountdown,
  formatDuration,
  formatKm,
  hoursToDeadline,
  hoursToTca,
  sampleAt,
  SEVERITY_HEX,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { useElementSize } from "@/lib/use-element-size";
import { Pc } from "@/components/ui/Readouts";

/*
 * Probability-of-collision timeline.
 *
 * Shared absolute time axis, now −12h to now +72h. One lane per conjunction,
 * each running left to right and terminating at its own TCA. Inside a lane, Pc
 * is drawn on a five-decade log scale with a ±1σ confidence band around it.
 * The band is wide at first screening and narrow at TCA, so the reader watches
 * the estimate tighten as tracking data accumulates.
 *
 * The drawing is done in real pixels — the viewBox tracks the measured width —
 * so type stays at its authored size on every screen. A narrow viewport buys
 * less time resolution, not smaller labels. Below ~760px the lane label moves
 * from a left gutter to a header row inside a taller lane.
 *
 * No gradients, no shadows, no glows. Strokes are 1.5px.
 */

const LANE_GAP = 8;
const AXIS_H = 32;
const TOP = 20;
const LANE_PAD_Y = 8;

const WINDOW_START = -12;
const WINDOW_END = 72;
const WINDOW_SPAN = WINDOW_END - WINDOW_START;

const LOG_MIN = -7;
const LOG_MAX = -2;

const FALLBACK_W = 1080;
const FALLBACK_H = 900;
const MIN_W = 320;
// Lanes grow to fill the panel rather than sitting content-sized with dead
// space beneath. A taller lane is worth real legibility: the ±1σ band is a
// fraction of five decades, so at 56px it collapses to a few pixels.
const MAX_LANE_H = 128;

type Pt = { offset: number; pc: number; sigma: number };

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

export function PcTimeline({
  conjunctions,
  selectedId,
  onSelect,
}: {
  conjunctions: Conjunction[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const nowMs = useMissionClock();
  const reduced = useReducedMotion();
  const [containerRef, measured] = useElementSize<HTMLDivElement>(
    FALLBACK_W,
    FALLBACK_H
  );
  const [hover, setHover] = useState<{ id: string; left: number; top: number } | null>(
    null
  );

  const w = Math.max(measured.width, MIN_W);
  const compact = w < 760;

  const GUTTER = compact ? 8 : 168;
  const PAD_R = compact ? 12 : 24;

  const MIN_LANE_H = compact ? 76 : 56;
  const available = measured.height - TOP - AXIS_H + LANE_GAP;
  const LANE_H = Math.round(
    Math.max(
      MIN_LANE_H,
      Math.min(MAX_LANE_H, available / Math.max(conjunctions.length, 1) - LANE_GAP)
    )
  );
  // On compact lanes the label occupies a header row above the plot area.
  const LABEL_H = compact ? 32 : 0;
  const LANE_USABLE = LANE_H - LABEL_H - LANE_PAD_Y * 2;

  const PLOT_X0 = GUTTER;
  const PLOT_X1 = w - PAD_R;
  const PLOT_W = Math.max(PLOT_X1 - PLOT_X0, 1);

  const x = (offsetHours: number) =>
    Math.round(
      (PLOT_X0 + ((offsetHours - WINDOW_START) / WINDOW_SPAN) * PLOT_W) * 100
    ) / 100;

  const laneTopFor = (i: number) => TOP + i * (LANE_H + LANE_GAP);

  /**
   * Rounded to two decimals on purpose. Math.log10 and ** are only
   * implementation-precise, so Node and the browser can disagree in the last
   * bits — enough to mismatch on a raw `cy` during hydration.
   */
  const y = (pc: number, laneTop: number) => {
    const l = Math.max(LOG_MIN, Math.min(LOG_MAX, Math.log10(pc)));
    const v =
      laneTop +
      LABEL_H +
      LANE_PAD_Y +
      (1 - (l - LOG_MIN) / (LOG_MAX - LOG_MIN)) * LANE_USABLE;
    return Math.round(v * 100) / 100;
  };

  /** Series in absolute-offset space, clipped to the visible window. */
  const toPoints = (c: Conjunction): Pt[] => {
    const raw: Pt[] = c.pcSeries.map((s) => ({
      offset: c.tcaOffsetHours - s.tMinusHours,
      pc: s.pc,
      sigma: s.sigmaLog10,
    }));
    const visible = raw.filter((p) => p.offset >= WINDOW_START);
    if (visible.length === raw.length || visible.length === 0) return visible;
    // Re-anchor a clipped campaign to the left edge so the band starts at the
    // window boundary rather than appearing from nowhere.
    const s = sampleAt(c.pcSeries, c.tcaOffsetHours - WINDOW_START);
    return [{ offset: WINDOW_START, pc: s.pc, sigma: s.sigmaLog10 }, ...visible];
  };

  const linePath = (pts: Pt[], laneTop: number) =>
    pts.length === 0
      ? ""
      : `M${pts.map((p) => `${x(p.offset)},${y(p.pc, laneTop)}`).join(" L")}`;

  const bandPath = (pts: Pt[], laneTop: number) => {
    if (pts.length < 2) return "";
    const upper = pts.map(
      (p) => `${x(p.offset)},${y(p.pc * 10 ** p.sigma, laneTop)}`
    );
    const lower = [...pts]
      .reverse()
      .map((p) => `${x(p.offset)},${y(p.pc * 10 ** -p.sigma, laneTop)}`);
    return `M${upper.join(" L")} L${lower.join(" L")} Z`;
  };

  const elapsed = elapsedHours(nowMs);
  const nowX = x(elapsed);
  const height = TOP + conjunctions.length * (LANE_H + LANE_GAP) - LANE_GAP + AXIS_H;

  const tickStep = compact ? 24 : 12;
  const ticks: number[] = [];
  for (let h = WINDOW_START; h <= WINDOW_END; h += tickStep) ticks.push(h);

  const hovered = hover ? conjunctions.find((c) => c.id === hover.id) : null;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-y-auto">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width={w}
        height={height}
        role="img"
        aria-label={`Probability of collision over time for ${conjunctions.length} active conjunctions`}
        className="block max-w-full"
      >
        {ticks.map((h) => (
          <line
            key={`grid-${h}`}
            x1={x(h)}
            x2={x(h)}
            y1={TOP - 8}
            y2={height - AXIS_H}
            stroke="#1F2933"
            strokeWidth={1}
          />
        ))}

        {conjunctions.map((c, i) => {
          const laneTop = laneTopFor(i);
          const severity = conjunctionSeverity(c, nowMs);
          const color = SEVERITY_HEX[severity];
          const selected = c.id === selectedId;

          const pts = toPoints(c);
          const observed = pts.filter((p) => p.offset <= elapsed);
          const projected = pts.filter((p) => p.offset >= elapsed);

          // An exact sample at "now" stitched into both halves, so the solid
          // and dashed segments meet with no visible seam.
          const nowSample = sampleAt(c.pcSeries, hoursToTca(c, nowMs));
          const nowPt: Pt = {
            offset: elapsed,
            pc: nowSample.pc,
            sigma: nowSample.sigmaLog10,
          };

          const tcaX = x(c.tcaOffsetHours);
          const deadlineX = x(c.decisionOffsetHours);
          const laneStartX = x(Math.max(pts[0]?.offset ?? WINDOW_START, WINDOW_START));
          const deadlinePassed = hoursToDeadline(c, nowMs) <= 0;
          const thresholdY = y(PC_ACTION_THRESHOLD, laneTop);

          return (
            <g key={c.id}>
              <line
                x1={PLOT_X0}
                x2={PLOT_X1}
                y1={laneTop + LANE_H}
                y2={laneTop + LANE_H}
                stroke="#1F2933"
                strokeWidth={1}
              />

              {selected ? (
                <rect
                  x={0}
                  y={laneTop - 4}
                  width={w}
                  height={LANE_H + 8}
                  fill="#4DD4E8"
                  opacity={0.06}
                />
              ) : null}

              {/* Window in which a burn is no longer viable: after the decision
                  deadline, up to TCA. Recessed rather than tinted, so it reads
                  as closed without spending a status color on it. */}
              {deadlineX < tcaX ? (
                <rect
                  x={Math.max(deadlineX, PLOT_X0)}
                  y={laneTop + LABEL_H}
                  width={Math.max(0, tcaX - Math.max(deadlineX, PLOT_X0))}
                  height={LANE_H - LABEL_H}
                  fill="#0B0F14"
                  opacity={deadlinePassed ? 0.66 : 0.45}
                />
              ) : null}

              {/* 1×10⁻⁴ action threshold. */}
              <line
                x1={laneStartX}
                x2={tcaX}
                y1={thresholdY}
                y2={thresholdY}
                stroke="#6E7681"
                strokeWidth={1}
                strokeDasharray="1 3"
                opacity={0.6}
              />

              {/* ±1σ confidence band. Flat fill, no gradient. */}
              <motion.path
                d={bandPath(pts, laneTop)}
                fill={color}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 0.14 }}
                transition={{ duration: 0.4, delay: reduced ? 0 : 0.16 + i * 0.04 }}
              />

              {/* Observed estimate. */}
              <motion.path
                d={linePath([...observed, nowPt], laneTop)}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.52,
                  delay: reduced ? 0 : i * 0.04,
                  ease: "easeOut",
                }}
              />

              {/* Projection from now to TCA. */}
              <motion.path
                d={linePath([nowPt, ...projected], laneTop)}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.3, delay: reduced ? 0 : 0.36 + i * 0.04 }}
              />

              {/* Decision deadline — same visual weight as the event itself. */}
              {c.decisionOffsetHours >= WINDOW_START ? (
                <g>
                  <line
                    x1={deadlineX}
                    x2={deadlineX}
                    y1={laneTop + LABEL_H}
                    y2={laneTop + LANE_H}
                    stroke={deadlinePassed ? "#6E7681" : "#F85149"}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                  <rect
                    x={deadlineX}
                    y={laneTop + LABEL_H}
                    width={3}
                    height={7}
                    fill={deadlinePassed ? "#6E7681" : "#F85149"}
                  />
                </g>
              ) : null}

              {/* TCA terminator. */}
              <line
                x1={tcaX}
                x2={tcaX}
                y1={laneTop + LABEL_H + 2}
                y2={laneTop + LANE_H - 2}
                stroke={color}
                strokeWidth={1.5}
              />
              <circle cx={tcaX} cy={y(nowSample.pc, laneTop)} r={2.5} fill={color} />

              {/* Lane label — left gutter when wide, header row when compact. */}
              {compact ? (
                <g>
                  <circle cx={10} cy={laneTop + 10} r={3} fill={color} />
                  <text
                    x={20}
                    y={laneTop + 14}
                    fontSize={13}
                    fill={selected ? "#4DD4E8" : "#E6EDF3"}
                    className="font-sans"
                  >
                    {truncate(c.secondaryName, Math.max(10, Math.floor(w / 16)))}
                    <title>{c.secondaryName}</title>
                  </text>
                  <text
                    x={w - PAD_R}
                    y={laneTop + 14}
                    fontSize={11}
                    fill={deadlinePassed ? "#6E7681" : "#8B949E"}
                    textAnchor="end"
                    className="font-mono"
                  >
                    {formatCountdown(hoursToTca(c, nowMs))}
                  </text>
                  <text
                    x={20}
                    y={laneTop + 27}
                    fontSize={11}
                    fill="#8B949E"
                    className="font-mono"
                  >
                    {c.id} · {c.primaryId}
                  </text>
                </g>
              ) : (
                <g>
                  <circle cx={12} cy={laneTop + 14} r={3} fill={color} />
                  <text
                    x={24}
                    y={laneTop + 18}
                    fontSize={13}
                    fill={selected ? "#4DD4E8" : "#E6EDF3"}
                    className="font-sans"
                  >
                    {truncate(c.secondaryName, 19)}
                    <title>{c.secondaryName}</title>
                  </text>
                  <text
                    x={24}
                    y={laneTop + 34}
                    fontSize={11}
                    fill="#8B949E"
                    className="font-mono"
                  >
                    {c.id} · {c.primaryId}
                  </text>
                  <text
                    x={24}
                    y={laneTop + 48}
                    fontSize={11}
                    fill={deadlinePassed ? "#6E7681" : "#8B949E"}
                    className="font-mono"
                  >
                    {formatCountdown(hoursToTca(c, nowMs))}
                  </text>
                </g>
              )}

              {/* Hit area, above the marks. */}
              <rect
                x={0}
                y={laneTop - 4}
                width={w}
                height={LANE_H + 8}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(c.id)}
                onMouseMove={(e) => {
                  const box = containerRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setHover({
                    id: c.id,
                    left: e.clientX - box.left,
                    top: e.clientY - box.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* NOW. One rule across every lane. */}
        <line
          x1={nowX}
          x2={nowX}
          y1={TOP - 12}
          y2={height - AXIS_H}
          stroke="#E6EDF3"
          strokeWidth={1}
          opacity={0.55}
        />
        <text x={nowX + 4} y={TOP - 4} fontSize={11} fill="#E6EDF3" className="font-mono">
          NOW
        </text>

        <line
          x1={PLOT_X0}
          x2={PLOT_X1}
          y1={height - AXIS_H}
          y2={height - AXIS_H}
          stroke="#1F2933"
          strokeWidth={1}
        />
        {ticks.map((h) => (
          <text
            key={`tick-${h}`}
            x={x(h)}
            y={height - AXIS_H + 16}
            fontSize={11}
            fill="#6E7681"
            textAnchor="middle"
            className="font-mono"
          >
            {h === 0 ? "T0" : h > 0 ? `+${h}h` : `${h}h`}
          </text>
        ))}
        <text x={PLOT_X0} y={height - 4} fontSize={11} fill="#6E7681" className="font-mono">
          {compact
            ? "Pc 1×10⁻⁷ → 1×10⁻² · dashed = projection"
            : "Pc scale 1×10⁻⁷ → 1×10⁻² per lane · dashed = projection · band = ±1σ"}
        </text>
      </svg>

      {/* Glass tooltip — an overlay, so it gets the lifted material. */}
      {hovered && hover ? (
        <div
          className="glass-overlay pointer-events-none absolute z-20 w-[232px] rounded-md p-3"
          style={{
            left: Math.max(
              4,
              Math.min(hover.left + 12, (containerRef.current?.clientWidth ?? 0) - 244)
            ),
            top: hover.top + 12,
          }}
        >
          <p className="text-13 text-fg">{hovered.secondaryName}</p>
          <p className="font-mono text-11 text-fg-dim">
            {hovered.id} · NORAD {hovered.secondaryNorad}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-11">
            <dt className="text-fg-dim">Pc</dt>
            <dd className="text-right">
              <Pc value={currentSample(hovered, nowMs).pc} />
            </dd>
            <dt className="text-fg-dim">±1σ</dt>
            <dd className="text-right font-mono">
              {currentSample(hovered, nowMs).sigmaLog10.toFixed(2)} dec
            </dd>
            <dt className="text-fg-dim">Miss</dt>
            <dd className="text-right font-mono">
              {formatKm(hovered.missDistanceKm)} km
            </dd>
            <dt className="text-fg-dim">TCA</dt>
            <dd className="text-right font-mono">
              {formatCountdown(hoursToTca(hovered, nowMs))}
            </dd>
            <dt className="text-fg-dim">Deadline</dt>
            <dd
              className={`text-right font-mono ${
                hoursToDeadline(hovered, nowMs) <= 0 ? "text-fg-dim" : "text-critical"
              }`}
            >
              {hoursToDeadline(hovered, nowMs) <= 0
                ? "passed"
                : formatDuration(hoursToDeadline(hovered, nowMs))}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
