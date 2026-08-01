import {
  PC_ACTION_THRESHOLD,
  PC_SCREENING_FLOOR,
  SCENARIO_EPOCH_MS,
  type Conjunction,
  type PcSample,
  type Severity,
} from "@/lib/data";

const HOUR_MS = 3_600_000;

/** Hours elapsed since the scenario anchor. Drives every derived time value. */
export function elapsedHours(nowMs: number): number {
  return (nowMs - SCENARIO_EPOCH_MS) / HOUR_MS;
}

export function offsetToMs(offsetHours: number): number {
  return SCENARIO_EPOCH_MS + offsetHours * HOUR_MS;
}

/**
 * Interpolate a screening campaign at an arbitrary time-to-TCA.
 *
 * Pc is interpolated in log space because it moves by orders of magnitude —
 * a linear blend between 1e-5 and 1e-4 would sit at 5.5e-5 rather than the
 * 3.2e-5 a log midpoint gives, which is the honest reading of a curve that is
 * plotted logarithmically.
 */
export function sampleAt(series: PcSample[], tMinusHours: number): PcSample {
  const first = series[0];
  const last = series[series.length - 1];
  if (tMinusHours >= first.tMinusHours) return first;
  if (tMinusHours <= last.tMinusHours) return last;

  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i];
    const b = series[i + 1];
    if (tMinusHours <= a.tMinusHours && tMinusHours >= b.tMinusHours) {
      const span = a.tMinusHours - b.tMinusHours;
      const t = span === 0 ? 0 : (a.tMinusHours - tMinusHours) / span;
      return {
        tMinusHours,
        pc: Math.pow(
          10,
          Math.log10(a.pc) + t * (Math.log10(b.pc) - Math.log10(a.pc))
        ),
        sigmaLog10: a.sigmaLog10 + t * (b.sigmaLog10 - a.sigmaLog10),
      };
    }
  }
  return last;
}

export function hoursToTca(c: Conjunction, nowMs: number): number {
  return c.tcaOffsetHours - elapsedHours(nowMs);
}

export function hoursToDeadline(c: Conjunction, nowMs: number): number {
  return c.decisionOffsetHours - elapsedHours(nowMs);
}

export function currentSample(c: Conjunction, nowMs: number): PcSample {
  return sampleAt(c.pcSeries, hoursToTca(c, nowMs));
}

export function currentPc(c: Conjunction, nowMs: number): number {
  return currentSample(c, nowMs).pc;
}

/**
 * Critical means act now: either the estimate is above the action threshold, or
 * the window to act is inside six hours on an event that is still live.
 */
export function conjunctionSeverity(c: Conjunction, nowMs: number): Severity {
  const pc = currentPc(c, nowMs);
  const deadline = hoursToDeadline(c, nowMs);
  if (pc >= PC_ACTION_THRESHOLD) return "critical";
  if (deadline > 0 && deadline <= 6 && pc >= PC_SCREENING_FLOOR) {
    return "critical";
  }
  if (pc >= PC_SCREENING_FLOOR) return "caution";
  return "nominal";
}

export type Trend = "rising" | "falling" | "flat";

/** Direction of the estimate over the last twelve hours of screening. */
export function pcTrend(c: Conjunction, nowMs: number): Trend {
  const tNow = hoursToTca(c, nowMs);
  const now = sampleAt(c.pcSeries, tNow).pc;
  const before = sampleAt(c.pcSeries, tNow + 12).pc;
  const ratio = now / before;
  if (ratio > 1.25) return "rising";
  if (ratio < 0.8) return "falling";
  return "flat";
}

// ---------------------------------------------------------------- formatting

/**
 * Split a probability into mantissa and exponent for superscript rendering.
 *
 * Uses toExponential rather than log10/pow because its output is exactly
 * specified by ECMAScript — the math route is only implementation-precise and
 * can disagree between the server and the browser.
 */
export function pcParts(pc: number): { mantissa: string; exponent: number } {
  if (pc <= 0) return { mantissa: "0", exponent: 0 };
  const [mantissa, exponent] = pc.toExponential(1).split("e");
  return { mantissa, exponent: Number(exponent) };
}

export function formatPc(pc: number): string {
  if (pc <= 0) return "—";
  const { mantissa, exponent } = pcParts(pc);
  return `${mantissa}e${exponent}`;
}

const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");

/** `T−09:14:22`. Always the same width, so a live row never reflows. */
export function formatCountdown(hours: number): string {
  const sign = hours < 0 ? "+" : "−";
  const total = Math.abs(hours) * 3600;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return `T${sign}${String(h).padStart(2, "0")}:${pad(m)}:${pad(s)}`;
}

/** Compact duration for deadlines and source ages: `3h 20m`, `46m`. */
export function formatDuration(hours: number): string {
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.floor((abs - h) * 60);
  if (h === 0) return `${m}m`;
  if (h < 24) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function formatUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
  );
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function formatDayStamp(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase()}`;
}

export function formatKm(km: number, digits = 3): string {
  return km.toFixed(digits);
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export const SEVERITY_TEXT: Record<Severity, string> = {
  nominal: "text-nominal",
  caution: "text-caution",
  critical: "text-critical",
};

export const SEVERITY_BG: Record<Severity, string> = {
  nominal: "bg-nominal",
  caution: "bg-caution",
  critical: "bg-critical",
};

export const SEVERITY_HEX: Record<Severity, string> = {
  nominal: "#3FB950",
  caution: "#D29922",
  critical: "#F85149",
};

export { PC_ACTION_THRESHOLD, PC_SCREENING_FLOOR };
