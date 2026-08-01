"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/data";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

/**
 * Thresholds are display-only in v0.1 — the controls are wired to local state
 * so the interaction is real, but nothing here writes to the screening data.
 */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-line px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-13 text-fg">{label}</p>
        <p className="text-11 text-fg-dim">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-line p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-sm px-2.5 py-1 font-mono text-11 transition-colors duration-150",
            value === o ? "bg-accent/15 text-accent" : "text-fg-dim hover:text-fg"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [action, setAction] = useState("1×10⁻⁴");
  const [floor, setFloor] = useState("1×10⁻⁵");
  const [missFloor, setMissFloor] = useState("5 km");
  const [lead, setLead] = useState("8 h");
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(SOURCES.map((s) => [s.id, s.kind === "onboard" ? "high" : "normal"]))
  );

  return (
    <Page
      title="Settings"
      subtitle="Screening thresholds, decision lead time, and per-network trust"
    >
      <div className="grid max-w-[960px] grid-cols-1 gap-2 pb-2">
        <Panel title="Screening thresholds" bodyClassName="">
          <Row
            label="Pc action threshold"
            hint="Above this, an event is critical and a maneuver solution is generated"
          >
            <Choice
              options={["1×10⁻³", "1×10⁻⁴", "1×10⁻⁵"]}
              value={action}
              onChange={setAction}
            />
          </Row>
          <Row
            label="Pc screening floor"
            hint="Below this, events are logged but stay off the console"
          >
            <Choice
              options={["1×10⁻⁵", "1×10⁻⁶", "1×10⁻⁷"]}
              value={floor}
              onChange={setFloor}
            />
          </Row>
          <Row
            label="Miss distance floor"
            hint="Screen every approach closer than this regardless of Pc"
          >
            <Choice
              options={["2 km", "5 km", "10 km"]}
              value={missFloor}
              onChange={setMissFloor}
            />
          </Row>
        </Panel>

        <Panel title="Decision timing">
          <Row
            label="Command lead time"
            hint="Upload, propagation, and contact margin subtracted from TCA to set the decision deadline"
          >
            <Choice options={["4 h", "6 h", "8 h", "12 h"]} value={lead} onChange={setLead} />
          </Row>
        </Panel>

        <Panel title="Source trust">
          {SOURCES.map((s) => (
            <Row
              key={s.id}
              label={s.name}
              hint={`${s.kind} · ${s.coverage}`}
            >
              <Choice
                options={["low", "normal", "high"]}
                value={weights[s.id]}
                onChange={(v) => setWeights((w) => ({ ...w, [s.id]: v }))}
              />
            </Row>
          ))}
        </Panel>

        <p className="px-2 text-11 text-fg-dim">
          v0.1 prototype — these controls hold local state only and do not write
          back to the screening data.
        </p>
      </div>
    </Page>
  );
}
