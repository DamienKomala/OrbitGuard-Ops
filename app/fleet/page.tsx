"use client";

import { useRouter } from "next/navigation";
import { CONJUNCTIONS, FLEET } from "@/lib/data";
import { conjunctionSeverity, SEVERITY_TEXT } from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { StatusDot } from "@/components/ui/Readouts";

export default function FleetPage() {
  const nowMs = useMissionClock();
  const router = useRouter();

  return (
    <Page
      title="Fleet"
      subtitle={`${FLEET.length} spacecraft under OrbitGuard screening`}
    >
      <Panel bodyClassName="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>Spacecraft</Th>
              <Th>NORAD</Th>
              <Th>Bus</Th>
              <Th align="right">Alt km</Th>
              <Th align="right">Incl °</Th>
              <Th align="right">Period min</Th>
              <Th align="right">Propellant kg</Th>
              <Th align="right">Reserve kg</Th>
              <Th align="right">Δv m/s</Th>
              <Th align="right">SK runway</Th>
              <Th align="right">Active events</Th>
            </tr>
          </thead>
          <tbody>
            {FLEET.map((s) => {
              const events = CONJUNCTIONS.filter((c) => c.primaryId === s.id);
              const worst = events.reduce<"nominal" | "caution" | "critical">(
                (acc, c) => {
                  const sev = conjunctionSeverity(c, nowMs);
                  if (sev === "critical") return "critical";
                  if (sev === "caution" && acc !== "critical") return "caution";
                  return acc;
                },
                "nominal"
              );
              const runway =
                (s.propellantKg - s.reserveKg) / s.annualStationKeepingKg;

              return (
                <Tr key={s.id} onClick={() => router.push(`/fleet/${s.id}`)}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <StatusDot severity={worst} />
                      <span className="font-mono text-fg-muted">{s.id}</span>
                      <span className="text-fg">{s.name}</span>
                    </span>
                  </Td>
                  <Td mono className="text-fg-dim">
                    {s.norad}
                  </Td>
                  <Td className="text-fg-muted">{s.bus}</Td>
                  <Td align="right" mono>
                    {s.altitudeKm}
                  </Td>
                  <Td align="right" mono>
                    {s.inclinationDeg.toFixed(1)}
                  </Td>
                  <Td align="right" mono>
                    {s.periodMin.toFixed(1)}
                  </Td>
                  <Td align="right" mono>
                    {s.propellantKg.toFixed(2)}
                    <span className="ml-1 text-11 text-fg-dim">
                      / {s.propellantCapacityKg.toFixed(1)}
                    </span>
                  </Td>
                  <Td align="right" mono className="text-fg-dim">
                    {s.reserveKg.toFixed(1)}
                  </Td>
                  <Td align="right" mono>
                    {s.deltaVRemainingMs.toFixed(1)}
                  </Td>
                  <Td align="right" mono className="text-fg-muted">
                    {runway.toFixed(1)} yr
                  </Td>
                  <Td
                    align="right"
                    mono
                    className={events.length ? SEVERITY_TEXT[worst] : "text-fg-dim"}
                  >
                    {events.length}
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
