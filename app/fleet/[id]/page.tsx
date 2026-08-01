"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { CONJUNCTIONS, FLEET, MANEUVER_LOG } from "@/lib/data";
import {
  conjunctionSeverity,
  currentPc,
  formatCountdown,
  formatDuration,
  formatKm,
  hoursToTca,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { BackLink, Page } from "@/components/ui/Page";
import { Field, Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Pc, StatusDot } from "@/components/ui/Readouts";
import { BudgetBar } from "@/components/ui/BudgetBar";

export default function SpacecraftDetailPage() {
  const params = useParams<{ id: string }>();
  const nowMs = useMissionClock();
  const router = useRouter();

  const craft = FLEET.find((s) => s.id === params.id);
  if (!craft) notFound();

  const events = CONJUNCTIONS.filter((c) => c.primaryId === craft.id);
  const burns = MANEUVER_LOG.filter((m) => m.spacecraftId === craft.id);
  const runway = (craft.propellantKg - craft.reserveKg) / craft.annualStationKeepingKg;

  return (
    <Page
      title={`${craft.id} · ${craft.name}`}
      subtitle={`${craft.bus} — launched ${craft.launchedIso}, NORAD ${craft.norad}`}
      actions={<BackLink href="/fleet" label="All spacecraft" />}
    >
      <div className="flex flex-col gap-2 pb-2">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title="Orbit" bodyClassName="grid grid-cols-3 gap-4 p-4">
            <Field label="Altitude" value={String(craft.altitudeKm)} unit="km" />
            <Field
              label="Inclination"
              value={craft.inclinationDeg.toFixed(1)}
              unit="°"
            />
            <Field label="Period" value={craft.periodMin.toFixed(1)} unit="min" />
          </Panel>

          <Panel title="Propellant" bodyClassName="p-4">
            <div className="mb-3 grid grid-cols-3 gap-4">
              <Field
                label="Remaining"
                value={craft.propellantKg.toFixed(2)}
                unit="kg"
              />
              <Field
                label="Delta-v"
                value={craft.deltaVRemainingMs.toFixed(1)}
                unit="m/s"
              />
              <Field label="SK runway" value={runway.toFixed(1)} unit="yr" />
            </div>
            <BudgetBar
              capacityKg={craft.propellantCapacityKg}
              remainingKg={craft.propellantKg}
              burnKg={0}
              reserveKg={craft.reserveKg}
            />
          </Panel>
        </div>

        <Panel
          title="Active conjunctions"
          meta={`${events.length} screening`}
          bodyClassName="overflow-auto"
        >
          {events.length === 0 ? (
            <p className="p-4 text-13 text-fg-dim">
              No events currently screening against this spacecraft.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Secondary</Th>
                  <Th align="right">TCA</Th>
                  <Th align="right">Miss km</Th>
                  <Th align="right">Pc</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((c) => {
                  const sev = conjunctionSeverity(c, nowMs);
                  return (
                    <Tr
                      key={c.id}
                      onClick={() => router.push(`/conjunctions/${c.id}`)}
                    >
                      <Td mono>
                        <span className="flex items-center gap-2">
                          <StatusDot severity={sev} />
                          {c.id}
                        </span>
                      </Td>
                      <Td>{c.secondaryName}</Td>
                      <Td align="right" mono className={SEVERITY_TEXT[sev]}>
                        {formatCountdown(hoursToTca(c, nowMs))}
                      </Td>
                      <Td align="right" mono>
                        {formatKm(c.missDistanceKm)}
                      </Td>
                      <Td align="right">
                        <Pc value={currentPc(c, nowMs)} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Maneuver history" bodyClassName="overflow-auto">
          <Table>
            <thead>
              <tr>
                <Th>Burn</Th>
                <Th>Event</Th>
                <Th align="right">When</Th>
                <Th align="right">Δv m/s</Th>
                <Th align="right">Propellant kg</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {burns.map((m) => (
                <Tr key={m.id} onClick={() => router.push(`/maneuvers/${m.id}`)}>
                  <Td mono>{m.id}</Td>
                  <Td mono className="text-fg-muted">
                    {m.conjunctionId}
                  </Td>
                  <Td align="right" mono className="text-fg-muted">
                    {m.offsetHours < 0
                      ? `${formatDuration(m.offsetHours)} ago`
                      : `in ${formatDuration(m.offsetHours)}`}
                  </Td>
                  <Td align="right" mono>
                    {m.deltaVMs.toFixed(2)}
                  </Td>
                  <Td align="right" mono>
                    {m.propellantKg.toFixed(3)}
                  </Td>
                  <Td className="text-fg-muted">{m.status}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </Page>
  );
}
