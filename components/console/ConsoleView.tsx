"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CONJUNCTIONS } from "@/lib/data";
import { Panel } from "@/components/ui/Panel";
import { ConjunctionQueue } from "./ConjunctionQueue";
import { PcTimeline } from "./PcTimeline";
import { ManeuverPlanner } from "./ManeuverPlanner";
import { SourceStrip } from "./SourceStrip";
import { cn } from "@/lib/cn";

type Pane = "queue" | "timeline" | "planner";

const PANES: Array<{ key: Pane; label: string }> = [
  { key: "queue", label: "Queue" },
  { key: "timeline", label: "Timeline" },
  { key: "planner", label: "Planner" },
];

/**
 * The console. Queue, timeline, and planner share one selection, so an operator
 * never has to reconcile two views of the same event.
 *
 * At xl the three sit side by side and each scrolls internally. Below that
 * there is not enough width for three dense panes at once, so a segmented
 * control swaps between them — selection still carries across, and picking an
 * event in the queue leaves it selected when you switch to the planner.
 */
export function ConsoleView() {
  // CJ-4471 — the event that actually needs a decision this shift.
  const [selectedId, setSelectedId] = useState("CJ-4471");
  const [pane, setPane] = useState<Pane>("timeline");

  const selected =
    CONJUNCTIONS.find((c) => c.id === selectedId) ?? CONJUNCTIONS[0];

  // At xl every pane is visible regardless of the segmented control.
  const paneClass = (key: Pane) =>
    cn(pane === key ? "flex" : "hidden", "xl:flex");

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex items-center gap-1 rounded-md border border-line p-1 xl:hidden">
        {PANES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPane(p.key)}
            aria-pressed={pane === p.key}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-13 transition-colors duration-150",
              pane === p.key
                ? "bg-accent/15 text-accent"
                : "text-fg-dim hover:text-fg"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[theme(spacing.queue)_1fr_theme(spacing.planner)]">
        <Panel
          title="Active conjunctions"
          meta={`${CONJUNCTIONS.length} screening`}
          bodyClassName="overflow-hidden"
          className={cn(paneClass("queue"), "min-h-[60vh] xl:min-h-0")}
        >
          <ConjunctionQueue
            conjunctions={CONJUNCTIONS}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Panel>

        <Panel
          title="Probability of collision · now −12h → +72h"
          meta="log scale · ±1σ"
          bodyClassName="overflow-hidden p-2"
          className={cn(paneClass("timeline"), "min-h-[60vh] xl:min-h-0")}
        >
          <PcTimeline
            conjunctions={CONJUNCTIONS}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Panel>

        <Panel
          title="Maneuver planner"
          meta={
            <Link
              href={`/conjunctions/${selected.id}`}
              className="inline-flex items-center gap-1 transition-colors hover:text-accent"
            >
              {selected.id}
              <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
          }
          bodyClassName="overflow-hidden"
          className={cn(paneClass("planner"), "min-h-[60vh] xl:min-h-0")}
        >
          <ManeuverPlanner conjunction={selected} />
        </Panel>
      </div>

      <SourceStrip />
    </div>
  );
}
