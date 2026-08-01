"use client";

import { usePathname } from "next/navigation";
import { Command } from "lucide-react";
import { useMissionClock } from "@/lib/mission-clock";
import { CONJUNCTIONS, SOURCES } from "@/lib/data";
import { conjunctionSeverity, formatClock, formatDayStamp } from "@/lib/format";
import { sourceSeverity } from "@/lib/data/sources";
import { StatusDot } from "@/components/ui/Readouts";
import { navTitle } from "@/lib/nav";

/**
 * 40px top strip: where you are, what time it is in UTC, and whether anything
 * needs a human. Glass, since it spans content that scrolls beneath it.
 *
 * Elements drop out as width shrinks, in reverse order of how urgent they are:
 * the breadcrumb goes first, then the alert counts, then the palette shortcut.
 * The state dot and the clock survive to the narrowest screen.
 */
export function StatusStrip({ onOpenPalette }: { onOpenPalette: () => void }) {
  const nowMs = useMissionClock();
  const pathname = usePathname();

  const severities = CONJUNCTIONS.map((c) => conjunctionSeverity(c, nowMs));
  const critical = severities.filter((s) => s === "critical").length;
  const caution = severities.filter((s) => s === "caution").length;

  const degradedSources = SOURCES.filter(
    (s) => sourceSeverity(s) !== "nominal"
  ).length;

  const systemState =
    critical > 0
      ? "critical"
      : caution > 0 || degradedSources > 0
        ? "caution"
        : "nominal";

  return (
    <header className="glass-chrome fixed inset-x-0 top-0 z-20 flex h-strip items-center justify-between gap-3 border-b border-line pl-3 pr-2 sm:pl-4 sm:pr-3 xl:left-rail">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <span className="shrink-0 text-13 font-medium text-fg">
          OrbitGuard<span className="hidden sm:inline"> Ops</span>
        </span>
        <span className="hidden text-11 text-fg-dim md:inline">/</span>
        <span className="hidden truncate text-13 text-fg-muted md:inline">
          {navTitle(pathname)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-2">
          <StatusDot severity={systemState} />
          <span className="hidden text-11 uppercase tracking-eyebrow text-fg-muted sm:inline">
            {systemState === "critical"
              ? "Action required"
              : systemState === "caution"
                ? "Monitoring"
                : "Nominal"}
          </span>
        </div>

        <div className="hidden items-center gap-3 text-11 lg:flex">
          <span className="text-critical">{critical} critical</span>
          <span className="text-caution">{caution} caution</span>
          {degradedSources > 0 ? (
            <span className="text-fg-dim">{degradedSources} source degraded</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          className="hidden items-center gap-1.5 rounded-md border border-line px-2 py-1 text-11 text-fg-dim transition-colors hover:border-accent/40 hover:text-fg md:flex"
        >
          <Command className="size-3" aria-hidden="true" />
          <span>K</span>
        </button>

        {/* The clock. Tabular mono so the strip never shifts on the second. */}
        <div className="flex items-baseline gap-2 font-mono">
          <span className="hidden text-11 text-fg-dim sm:inline">
            {formatDayStamp(nowMs)}
          </span>
          <span className="text-13 text-fg sm:text-15">{formatClock(nowMs)}</span>
          <span className="text-11 text-fg-dim">UTC</span>
        </div>
      </div>
    </header>
  );
}
