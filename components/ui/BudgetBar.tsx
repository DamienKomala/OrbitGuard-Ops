"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Station-keeping propellant as a depleting budget.
 *
 * The track is total capacity. The fill is what is left. The segment at the
 * fill's leading edge is what the proposed burn would consume, and the tick is
 * the end-of-mission reserve the fill may not cross. When a burn would push
 * remaining propellant below that reserve the whole fill goes critical, because
 * at that point the burn is no longer a fuel question but a mission-length one.
 */
export function BudgetBar({
  capacityKg,
  remainingKg,
  burnKg,
  reserveKg,
}: {
  capacityKg: number;
  remainingKg: number;
  burnKg: number;
  reserveKg: number;
}) {
  const reduced = useReducedMotion();
  const pct = (kg: number) => Math.max(0, Math.min(100, (kg / capacityKg) * 100));

  const afterBurn = remainingKg - burnKg;
  const breachesReserve = afterBurn < reserveKg;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-4 w-full overflow-hidden rounded-sm border border-line bg-panel-alt"
        role="img"
        aria-label={`${remainingKg.toFixed(2)} of ${capacityKg.toFixed(1)} kg propellant remaining; this burn consumes ${burnKg.toFixed(3)} kg; reserve is ${reserveKg.toFixed(1)} kg`}
      >
        {/* Propellant that survives the burn. */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0",
            breachesReserve ? "bg-critical/70" : "bg-nominal/70"
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct(afterBurn)}%` }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        />
        {/* What this burn costs, at the leading edge of the fill. */}
        <motion.div
          className="absolute inset-y-0 bg-caution"
          initial={reduced ? false : { width: 0 }}
          animate={{ left: `${pct(afterBurn)}%`, width: `${pct(burnKg)}%` }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        />
        {/* End-of-mission reserve. The fill may not fall left of this. */}
        <div
          className="absolute inset-y-0 w-px bg-critical"
          style={{ left: `${pct(reserveKg)}%` }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-11">
        <span className={breachesReserve ? "text-critical" : "text-fg-muted"}>
          {afterBurn.toFixed(3)} kg after burn
        </span>
        <span className="text-fg-dim">
          reserve {reserveKg.toFixed(1)} · capacity {capacityKg.toFixed(1)} kg
        </span>
      </div>

      {breachesReserve ? (
        <p className="text-11 text-critical">
          Burn crosses end-of-mission reserve. Flight director approval required.
        </p>
      ) : null}
    </div>
  );
}
