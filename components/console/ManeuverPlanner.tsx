"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { planFor, spacecraftById, type Conjunction } from "@/lib/data";
import {
  currentPc,
  elapsedHours,
  formatCountdown,
  formatDuration,
  formatKm,
  hoursToDeadline,
  offsetToMs,
  formatUtc,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { Field } from "@/components/ui/Panel";
import { Pc } from "@/components/ui/Readouts";
import { cn } from "@/lib/cn";

const EFFECT_STYLE = {
  resolved: { label: "resolved", tone: "text-nominal", bar: "bg-nominal" },
  improved: { label: "improved", tone: "text-nominal", bar: "bg-nominal" },
  created: { label: "created", tone: "text-caution", bar: "bg-caution" },
  worsened: { label: "worsened", tone: "text-critical", bar: "bg-critical" },
} as const;

/**
 * The burn, what it costs, and what it does to everything else.
 *
 * The downstream list is the panel's reason to exist: resolving one conjunction
 * routinely creates others, and no burn should be committed without that
 * consequence visible on the same screen.
 */
export function ManeuverPlanner({ conjunction }: { conjunction: Conjunction }) {
  const nowMs = useMissionClock();
  const reduced = useReducedMotion();

  const plan = planFor(conjunction.id);
  const craft = spacecraftById(conjunction.primaryId);
  const deadline = hoursToDeadline(conjunction, nowMs);
  const expired = deadline <= 0;

  if (!plan) {
    return (
      <div className="p-4 text-13 text-fg-dim">
        No maneuver solution generated for this event.
      </div>
    );
  }

  const pcNow = currentPc(conjunction, nowMs);

  return (
    <motion.div
      key={conjunction.id}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="flex h-full flex-col overflow-y-auto"
    >
      {/* Proposed burn */}
      <div className="border-b border-line p-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="eyebrow">Proposed burn</span>
          <span className="font-mono text-11 text-fg-dim">
            {craft.id} · {craft.name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Delta-v" value={plan.deltaVMs.toFixed(2)} unit="m/s" size="lg" />
          <Field label="Propellant" value={plan.propellantKg.toFixed(3)} unit="kg" size="lg" />
          <Field label="Axis" value={plan.axis} size="sm" />
          <Field label="Burn duration" value={`${plan.durationS}`} unit="s" size="sm" />
        </div>

        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-11">
          <div className="flex justify-between">
            <dt className="text-fg-dim">Execute</dt>
            <dd className="font-mono text-fg-muted">
              {formatUtc(offsetToMs(plan.burnOffsetHours))}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">Upload pass</dt>
            <dd className="font-mono text-fg-muted">
              {plan.uploadStation} ·{" "}
              {formatCountdown(plan.uploadOffsetHours - elapsedHours(nowMs))}
            </dd>
          </div>
        </dl>
      </div>

      {/* Effect on this event */}
      <div className="border-b border-line p-3">
        <span className="eyebrow">Effect on {conjunction.id}</span>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-11 text-fg-dim">Pc now</span>
            <Pc value={pcNow} className="text-20 text-critical" />
          </div>
          <ArrowRight className="size-4 text-fg-dim" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-11 text-fg-dim">Pc after</span>
            <Pc value={plan.pcAfter} className="text-20 text-nominal" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-11 text-fg-dim">Miss now</span>
            <span className="font-mono text-15">
              {formatKm(conjunction.missDistanceKm)}
              <span className="ml-1 text-11 text-fg-dim">km</span>
            </span>
          </div>
          <ArrowRight className="size-4 text-fg-dim" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-11 text-fg-dim">Miss after</span>
            <span className="font-mono text-15 text-nominal">
              {formatKm(plan.missDistanceAfterKm)}
              <span className="ml-1 text-11 text-fg-dim">km</span>
            </span>
          </div>
        </div>
      </div>

      {/* Station-keeping budget */}
      <div className="border-b border-line p-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="eyebrow">Station-keeping budget</span>
          <span className="font-mono text-11 text-fg-dim">
            {(
              (craft.propellantKg - plan.propellantKg - craft.reserveKg) /
              craft.annualStationKeepingKg
            ).toFixed(1)}{" "}
            yr runway
          </span>
        </div>
        <BudgetBar
          capacityKg={craft.propellantCapacityKg}
          remainingKg={craft.propellantKg}
          burnKg={plan.propellantKg}
          reserveKg={craft.reserveKg}
        />
      </div>

      {/* Downstream */}
      <div className="flex-1 p-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="eyebrow">Downstream conjunctions</span>
          <span className="text-11 text-fg-dim">
            {plan.downstream.length} affected
          </span>
        </div>

        <ul className="space-y-px">
          {plan.downstream.map((d, i) => {
            const style = EFFECT_STYLE[d.effect];
            return (
              <motion.li
                key={d.conjunctionId}
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: reduced ? 0 : i * 0.03 }}
                className="relative bg-panel-alt px-3 py-2"
              >
                <span
                  className={cn("row-status", style.bar)}
                  aria-hidden="true"
                />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-13 text-fg">{d.secondaryName}</span>
                  <span className={cn("shrink-0 text-11", style.tone)}>
                    {style.label}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2 text-11">
                  <span className="font-mono text-fg-dim">
                    {d.conjunctionId} · T+{d.tcaOffsetHours.toFixed(1)}h
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    {d.pcBefore > 0 ? (
                      <Pc value={d.pcBefore} className="text-fg-dim" />
                    ) : (
                      <span className="text-fg-dim">—</span>
                    )}
                    <ArrowRight className="size-3 text-fg-dim" aria-hidden="true" />
                    <Pc value={d.pcAfter} className={style.tone} />
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Commit */}
      <div className="sticky bottom-0 border-t border-line bg-panel p-3">
        {expired ? (
          <p className="mb-2 flex items-center gap-2 text-11 text-fg-dim">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            Decision deadline passed {formatDuration(deadline)} ago. This burn can
            no longer be uploaded in time.
          </p>
        ) : (
          <p className="mb-2 text-11 text-fg-muted">
            Commit within{" "}
            <span className="font-mono text-critical">
              {formatDuration(deadline)}
            </span>{" "}
            or the window closes.
          </p>
        )}
        <button
          type="button"
          disabled={expired}
          className={cn(
            "flex h-9 w-full items-center justify-center gap-2 rounded-md text-13 font-medium transition-colors duration-150",
            expired
              ? "cursor-not-allowed border border-line text-fg-dim"
              : "bg-accent text-bg hover:bg-accent/85"
          )}
        >
          <Check className="size-4" aria-hidden="true" />
          {expired ? "Window closed" : "Commit maneuver"}
        </button>
      </div>
    </motion.div>
  );
}
