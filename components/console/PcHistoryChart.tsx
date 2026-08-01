"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Conjunction } from "@/lib/data";
import { PC_ACTION_THRESHOLD, PC_SCREENING_FLOOR } from "@/lib/data";
import {
  conjunctionSeverity,
  hoursToDeadline,
  hoursToTca,
  sampleAt,
  SEVERITY_HEX,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { useElementSize } from "@/lib/use-element-size";

/**
 * Single-event campaign chart for the detail page.
 *
 * Same grammar as the console timeline — log Pc, ±1σ band, dashed projection —
 * at a size where every CDM in the campaign plots as its own observation and
 * the band's convergence is legible decade by decade. Drawn in real pixels
 * against the measured width, so labels hold their size on any screen.
 */

const FALLBACK_W = 1080;
const MIN_W = 320;
const LOG_MIN = -7;
const LOG_MAX = -2;

const superscript = (n: number) =>
  String(Math.abs(n))
    .split("")
    .map((ch) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(ch)])
    .join("");

export function PcHistoryChart({ conjunction }: { conjunction: Conjunction }) {
  const nowMs = useMissionClock();
  const reduced = useReducedMotion();
  const [containerRef, measured] = useElementSize<HTMLDivElement>(FALLBACK_W, 340);

  const W = Math.max(measured.width, MIN_W);
  const compact = W < 640;

  const H = compact ? 260 : 340;
  const L = compact ? 44 : 56;
  const R = compact ? 12 : 24;
  const T = 16;
  const B = 32;

  const color = SEVERITY_HEX[conjunctionSeverity(conjunction, nowMs)];
  const tNow = hoursToTca(conjunction, nowMs);
  const deadlineTMinus = conjunction.tcaOffsetHours - conjunction.decisionOffsetHours;

  // x runs from 72 hours before TCA (left) to TCA (right).
  const x = (tMinus: number) =>
    Math.round((L + (1 - tMinus / 72) * (W - L - R)) * 100) / 100;
  // Quantized for the same reason as the console timeline: Math.log10 is only
  // implementation-precise, and a raw coordinate would mismatch on hydration.
  const y = (pc: number) => {
    const l = Math.max(LOG_MIN, Math.min(LOG_MAX, Math.log10(pc)));
    return (
      Math.round((T + (1 - (l - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (H - T - B)) * 100) /
      100
    );
  };

  const pts = conjunction.pcSeries;
  const observed = pts.filter((p) => p.tMinusHours >= tNow);
  const projected = pts.filter((p) => p.tMinusHours <= tNow);
  const nowSample = sampleAt(pts, tNow);

  const line = (arr: typeof pts) =>
    arr.length
      ? `M${arr.map((p) => `${x(p.tMinusHours)},${y(p.pc)}`).join(" L")}`
      : "";

  const band = (arr: typeof pts) => {
    if (arr.length < 2) return "";
    const up = arr.map((p) => `${x(p.tMinusHours)},${y(p.pc * 10 ** p.sigmaLog10)}`);
    const dn = [...arr]
      .reverse()
      .map((p) => `${x(p.tMinusHours)},${y(p.pc * 10 ** -p.sigmaLog10)}`);
    return `M${up.join(" L")} L${dn.join(" L")} Z`;
  };

  const decades = compact ? [-2, -4, -6] : [-2, -3, -4, -5, -6, -7];
  const hourTicks = compact ? [72, 48, 24, 0] : [72, 60, 48, 36, 24, 12, 0];
  const deadlinePassed = hoursToDeadline(conjunction, nowMs) <= 0;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label={`Probability of collision campaign for ${conjunction.id}`}
      >
        {decades.map((d) => (
          <g key={d}>
            <line
              x1={L}
              x2={W - R}
              y1={y(10 ** d)}
              y2={y(10 ** d)}
              stroke="#1F2933"
              strokeWidth={1}
            />
            <text
              x={L - 8}
              y={y(10 ** d) + 4}
              fontSize={11}
              fill="#6E7681"
              textAnchor="end"
              className="font-mono"
            >
              10⁻{superscript(d)}
            </text>
          </g>
        ))}

        <line
          x1={L}
          x2={W - R}
          y1={y(PC_ACTION_THRESHOLD)}
          y2={y(PC_ACTION_THRESHOLD)}
          stroke="#F85149"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        {!compact ? (
          <text
            x={W - R - 4}
            y={y(PC_ACTION_THRESHOLD) - 5}
            fontSize={11}
            fill="#F85149"
            textAnchor="end"
            className="font-mono"
          >
            action threshold
          </text>
        ) : null}

        <line
          x1={L}
          x2={W - R}
          y1={y(PC_SCREENING_FLOOR)}
          y2={y(PC_SCREENING_FLOOR)}
          stroke="#D29922"
          strokeWidth={1}
          strokeDasharray="1 4"
          opacity={0.6}
        />

        {/* Closed window: after the decision deadline. */}
        <rect
          x={x(deadlineTMinus)}
          y={T}
          width={Math.max(0, x(0) - x(deadlineTMinus))}
          height={H - T - B}
          fill="#0B0F14"
          opacity={0.5}
        />

        <motion.path
          d={band(pts)}
          fill={color}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 0.16 }}
          transition={{ duration: 0.4, delay: reduced ? 0 : 0.15 }}
        />
        <motion.path
          d={line(observed)}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <path
          d={line(projected)}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.7}
        />

        {/* Every CDM in the campaign, as its own observation. */}
        {observed.map((p) => (
          <circle
            key={p.tMinusHours}
            cx={x(p.tMinusHours)}
            cy={y(p.pc)}
            r={2}
            fill="#0B0F14"
            stroke={color}
            strokeWidth={1.5}
          />
        ))}

        <line
          x1={x(deadlineTMinus)}
          x2={x(deadlineTMinus)}
          y1={T}
          y2={H - B}
          stroke={deadlinePassed ? "#6E7681" : "#F85149"}
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />
        {/* Flip the label to the left of its rule when the deadline sits close
            to TCA, which is exactly when it matters most and would otherwise
            run off the right edge. */}
        {!compact ? (
          <text
            x={
              x(deadlineTMinus) > W - R - 120
                ? x(deadlineTMinus) - 4
                : x(deadlineTMinus) + 4
            }
            y={T + 12}
            fontSize={11}
            fill={deadlinePassed ? "#6E7681" : "#F85149"}
            textAnchor={x(deadlineTMinus) > W - R - 120 ? "end" : "start"}
            className="font-mono"
          >
            decision deadline
          </text>
        ) : null}

        {tNow <= 72 && tNow >= 0 ? (
          <>
            <line
              x1={x(tNow)}
              x2={x(tNow)}
              y1={T}
              y2={H - B}
              stroke="#E6EDF3"
              strokeWidth={1}
              opacity={0.55}
            />
            <circle cx={x(tNow)} cy={y(nowSample.pc)} r={3} fill={color} />
            <text
              x={x(tNow) + 4}
              y={H - B - 6}
              fontSize={11}
              fill="#E6EDF3"
              className="font-mono"
            >
              NOW
            </text>
          </>
        ) : null}

        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#1F2933" strokeWidth={1} />
        {hourTicks.map((h) => (
          <text
            key={h}
            x={x(h)}
            y={H - B + 16}
            fontSize={11}
            fill="#6E7681"
            textAnchor="middle"
            className="font-mono"
          >
            {h === 0 ? "TCA" : `T−${h}h`}
          </text>
        ))}
      </svg>
    </div>
  );
}
