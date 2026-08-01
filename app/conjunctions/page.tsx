"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CONJUNCTIONS, sourceName } from "@/lib/data";
import {
  conjunctionSeverity,
  currentPc,
  formatCountdown,
  formatDuration,
  formatKm,
  hoursToDeadline,
  hoursToTca,
  pcTrend,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Pc, StatusDot, TrendMark } from "@/components/ui/Readouts";

type SortKey = "tca" | "pc" | "miss" | "deadline";

export default function ConjunctionsPage() {
  const nowMs = useMissionClock();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("tca");

  const rows = useMemo(() => {
    const list = [...CONJUNCTIONS];
    list.sort((a, b) => {
      switch (sort) {
        case "pc":
          return currentPc(b, nowMs) - currentPc(a, nowMs);
        case "miss":
          return a.missDistanceKm - b.missDistanceKm;
        case "deadline":
          return a.decisionOffsetHours - b.decisionOffsetHours;
        default:
          return a.tcaOffsetHours - b.tcaOffsetHours;
      }
    });
    return list;
  }, [sort, nowMs]);

  const header = (key: SortKey, label: string, align: "left" | "right" = "right") => (
    <Th align={align}>
      <button
        type="button"
        onClick={() => setSort(key)}
        className={sort === key ? "text-accent" : "hover:text-fg"}
      >
        {label}
      </button>
    </Th>
  );

  return (
    <Page
      title="Conjunctions"
      subtitle={`${CONJUNCTIONS.length} events screening against the fleet in the next 72 hours`}
    >
      <Panel bodyClassName="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Primary</Th>
              <Th>Secondary</Th>
              {header("tca", "TCA")}
              {header("deadline", "Decision")}
              {header("miss", "Miss km")}
              <Th align="right">R / I / C km</Th>
              <Th align="right">Rel vel km/s</Th>
              {header("pc", "Pc")}
              <Th>Trend</Th>
              <Th>Source</Th>
              <Th align="right">CDMs</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const severity = conjunctionSeverity(c, nowMs);
              const deadline = hoursToDeadline(c, nowMs);
              return (
                <Tr key={c.id} onClick={() => router.push(`/conjunctions/${c.id}`)}>
                  <Td mono>
                    <span className="flex items-center gap-2">
                      <StatusDot severity={severity} />
                      {c.id}
                    </span>
                  </Td>
                  <Td mono className="text-fg-muted">
                    {c.primaryId}
                  </Td>
                  <Td>
                    <span className="text-fg">{c.secondaryName}</span>
                    <span className="ml-2 font-mono text-11 text-fg-dim">
                      {c.secondaryNorad}
                    </span>
                  </Td>
                  <Td align="right" mono className={SEVERITY_TEXT[severity]}>
                    {formatCountdown(hoursToTca(c, nowMs))}
                  </Td>
                  <Td
                    align="right"
                    mono
                    className={deadline <= 0 ? "text-fg-dim" : "text-critical"}
                  >
                    {deadline <= 0 ? "closed" : formatDuration(deadline)}
                  </Td>
                  <Td align="right" mono>
                    {formatKm(c.missDistanceKm)}
                  </Td>
                  <Td align="right" mono className="text-fg-muted">
                    {formatKm(c.radialKm, 2)} / {formatKm(c.inTrackKm, 2)} /{" "}
                    {formatKm(c.crossTrackKm, 2)}
                  </Td>
                  <Td align="right" mono className="text-fg-muted">
                    {c.relVelocityKmS.toFixed(2)}
                  </Td>
                  <Td align="right">
                    <Pc value={currentPc(c, nowMs)} />
                  </Td>
                  <Td>
                    <TrendMark trend={pcTrend(c, nowMs)} />
                  </Td>
                  <Td className="text-fg-muted">{sourceName(c.sourceId)}</Td>
                  <Td align="right" mono className="text-fg-dim">
                    {c.cdmCount}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </Page>
  );
}
