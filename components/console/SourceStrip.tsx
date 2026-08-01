"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SOURCES, sourceSeverity } from "@/lib/data";
import { formatMinutes, SEVERITY_BG, SEVERITY_TEXT } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Data source freshness. One cell per tracking network.
 *
 * The fill is age against that network's own cadence, not against a wall clock:
 * a feed that delivers every eight hours is not late at 46 minutes, and an
 * optical feed on a one-hour cadence is. Anything a screening result depends on
 * has to be visible without leaving the console.
 *
 * Six across on a wide screen; wraps to three then two as width drops, which is
 * why the strip's height is fixed only from lg up.
 */
export function SourceStrip() {
  const reduced = useReducedMotion();

  return (
    <section
      aria-label="Tracking source freshness"
      className="grid shrink-0 grid-cols-2 rounded-md border border-line bg-panel sm:grid-cols-3 lg:h-sources lg:grid-cols-6"
    >
      {SOURCES.map((s, i) => {
        const severity = sourceSeverity(s);
        const ratio = Math.min(s.ageMin / s.cadenceMin, 1);

        return (
          <motion.div
            key={s.id}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: reduced ? 0 : i * 0.02 }}
            className={cn(
              "flex min-w-0 flex-col justify-between gap-1.5 border-line px-3 py-2",
              // Cell borders that survive wrapping at every column count.
              i % 2 === 1 && "border-l sm:border-l-0",
              i % 3 !== 0 && "sm:border-l lg:border-l-0",
              i > 0 && "lg:border-l",
              i >= 2 && "border-t sm:border-t-0",
              i >= 3 && "sm:border-t lg:border-t-0"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-13 text-fg">{s.name}</span>
              <span
                className={cn(
                  "mt-1.5 size-[6px] shrink-0 rounded-full",
                  SEVERITY_BG[severity]
                )}
                aria-hidden="true"
              />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className={cn("font-mono text-15", SEVERITY_TEXT[severity])}>
                {formatMinutes(s.ageMin)}
              </span>
              <span className="font-mono text-11 text-fg-dim">
                / {formatMinutes(s.cadenceMin)}
              </span>
            </div>

            {/* Age against cadence. Full bar means the next delivery is due. */}
            <div className="h-[3px] w-full rounded-sm bg-panel-alt">
              <motion.div
                className={cn("h-full rounded-sm", SEVERITY_BG[severity])}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={{ duration: 0.4, delay: reduced ? 0 : 0.1 + i * 0.02 }}
              />
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
