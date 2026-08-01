"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANEUVER_LOG, type ManeuverStatus } from "@/lib/data";
import { formatDuration } from "@/lib/format";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Pc } from "@/components/ui/Readouts";
import { cn } from "@/lib/cn";

const FILTERS: Array<{ key: ManeuverStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "proposed", label: "Proposed" },
  { key: "committed", label: "Committed" },
  { key: "executed", label: "Executed" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
];

const STATUS_TONE: Record<ManeuverStatus, string> = {
  proposed: "text-accent",
  committed: "text-caution",
  executed: "text-nominal",
  declined: "text-fg-dim",
  expired: "text-critical",
};

export default function ManeuversPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<ManeuverStatus | "all">("all");

  const rows = MANEUVER_LOG.filter(
    (m) => filter === "all" || m.status === filter
  );

  const totalPropellant = MANEUVER_LOG.filter(
    (m) => m.status === "executed"
  ).reduce((sum, m) => sum + m.propellantKg, 0);

  return (
    <Page
      title="Maneuvers"
      subtitle={`${MANEUVER_LOG.length} burns logged · ${totalPropellant.toFixed(3)} kg propellant spent on executed avoidance`}
      actions={
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-line p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-11 transition-colors duration-150",
                filter === f.key
                  ? "bg-accent/15 text-accent"
                  : "text-fg-dim hover:text-fg"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <Panel bodyClassName="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>Burn</Th>
              <Th>Spacecraft</Th>
              <Th>Event</Th>
              <Th>Secondary</Th>
              <Th align="right">When</Th>
              <Th align="right">Δv m/s</Th>
              <Th>Axis</Th>
              <Th align="right">Propellant kg</Th>
              <Th align="right">Pc before</Th>
              <Th align="right">Pc after</Th>
              <Th>Status</Th>
              <Th>Operator</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <Tr
                key={m.id}
                onClick={() => router.push(`/maneuvers/${m.id}`)}
              >
                <Td mono>{m.id}</Td>
                <Td mono className="text-fg-muted">
                  {m.spacecraftId}
                </Td>
                <Td mono className="text-fg-muted">
                  {m.conjunctionId}
                </Td>
                <Td>{m.secondaryName}</Td>
                <Td align="right" mono className="text-fg-muted">
                  {m.offsetHours < 0
                    ? `${formatDuration(m.offsetHours)} ago`
                    : `in ${formatDuration(m.offsetHours)}`}
                </Td>
                <Td align="right" mono>
                  {m.deltaVMs.toFixed(2)}
                </Td>
                <Td className="text-fg-muted">{m.axis}</Td>
                <Td align="right" mono>
                  {m.propellantKg.toFixed(3)}
                </Td>
                <Td align="right">
                  <Pc value={m.pcBefore} className="text-fg-muted" />
                </Td>
                <Td align="right">
                  <Pc value={m.pcAfter} className="text-nominal" />
                </Td>
                <Td className={STATUS_TONE[m.status]}>{m.status}</Td>
                <Td className="text-fg-dim">{m.operator}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </Page>
  );
}
