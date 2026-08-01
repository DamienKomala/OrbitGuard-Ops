"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Conjunction } from "@/lib/data";
import {
  conjunctionSeverity,
  currentPc,
  formatCountdown,
  formatDuration,
  formatKm,
  hoursToDeadline,
  hoursToTca,
  pcTrend,
  SEVERITY_BG,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { Pc, TrendMark } from "@/components/ui/Readouts";
import { cn } from "@/lib/cn";

/**
 * Ranked screening queue. Ordering is by severity first and TCA second, so the
 * row that needs a decision is always at the top regardless of when it happens.
 */
export function ConjunctionQueue({
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

  const rank = { critical: 0, caution: 1, nominal: 2 } as const;
  const ordered = [...conjunctions].sort((a, b) => {
    const sa = rank[conjunctionSeverity(a, nowMs)];
    const sb = rank[conjunctionSeverity(b, nowMs)];
    return sa !== sb ? sa - sb : a.tcaOffsetHours - b.tcaOffsetHours;
  });

  return (
    <ul className="h-full overflow-y-auto">
      {ordered.map((c, i) => {
        const severity = conjunctionSeverity(c, nowMs);
        const selected = c.id === selectedId;
        const deadline = hoursToDeadline(c, nowMs);
        const expired = deadline <= 0;

        return (
          <motion.li
            key={c.id}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: reduced ? 0 : i * 0.024 }}
            className="relative border-b border-line"
          >
            <span className={cn("row-status", SEVERITY_BG[severity])} aria-hidden="true" />
            {selected ? (
              <motion.span
                layoutId="queue-selected"
                className="pointer-events-none absolute inset-0 border-l-2 border-accent bg-accent/10"
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              />
            ) : null}

            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={selected}
              className="relative flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.02]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-15 text-fg">{c.secondaryName}</span>
                <span className="shrink-0 font-mono text-11 text-fg-dim">
                  {c.secondaryNorad}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-20 leading-none",
                    expired ? "text-fg-dim" : SEVERITY_TEXT[severity]
                  )}
                >
                  {formatCountdown(hoursToTca(c, nowMs))}
                </span>
                <Pc value={currentPc(c, nowMs)} className="text-15 text-fg" />
              </div>

              <div className="flex items-center justify-between gap-2 text-11">
                <span className="font-mono text-fg-muted">
                  {formatKm(c.missDistanceKm)} km
                  <span className="ml-1 text-fg-dim">miss</span>
                </span>
                <TrendMark trend={pcTrend(c, nowMs)} />
              </div>

              <div className="flex items-center justify-between gap-2 text-11">
                <span className="text-fg-dim">{c.primaryId}</span>
                <span className={expired ? "text-fg-dim" : "text-critical"}>
                  {expired
                    ? "window closed"
                    : `decide in ${formatDuration(deadline)}`}
                </span>
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
