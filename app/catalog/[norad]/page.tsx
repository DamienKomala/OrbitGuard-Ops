"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { catalogByNorad, CONJUNCTIONS, spacecraftById } from "@/lib/data";
import {
  conjunctionSeverity,
  currentPc,
  formatCountdown,
  formatKm,
  hoursToTca,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { BackLink, Page, RefLink } from "@/components/ui/Page";
import { Field, Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Pc, StatusDot } from "@/components/ui/Readouts";

export default function CatalogObjectPage() {
  const params = useParams<{ norad: string }>();
  const nowMs = useMissionClock();
  const router = useRouter();

  const object = catalogByNorad(params.norad);
  if (!object) notFound();

  // Every fleet event this object is the secondary in.
  const events = CONJUNCTIONS.filter((c) => c.secondaryNorad === object.norad);

  return (
    <Page
      title={`${object.norad} · ${object.name}`}
      subtitle={`${object.type.replace("-", " ")} — ${object.origin}`}
      actions={<BackLink href="/catalog" label="All objects" />}
    >
      <div className="flex flex-col gap-2 pb-2">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title="Orbit" bodyClassName="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Field label="Apogee" value={String(object.apogeeKm)} unit="km" />
            <Field label="Perigee" value={String(object.perigeeKm)} unit="km" />
            <Field
              label="Inclination"
              value={object.inclinationDeg.toFixed(1)}
              unit="°"
            />
            <Field
              label="RCS"
              value={object.rcsM2 === null ? "—" : object.rcsM2.toFixed(3)}
              unit={object.rcsM2 === null ? undefined : "m²"}
              tone={object.rcsM2 === null ? "text-fg-dim" : undefined}
            />
          </Panel>

          <Panel title="Characterization" bodyClassName="p-4">
            <dl className="space-y-2 text-13">
              {[
                ["Object type", object.type.replace("-", " ")],
                ["Origin", object.origin],
                [
                  "Radar cross-section",
                  object.rcsM2 === null
                    ? "uncharacterized"
                    : `${object.rcsM2.toFixed(3)} m²`,
                ],
                ["Active conjunctions", String(events.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-fg-dim">{k}</dt>
                  <dd className="text-right text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
            {object.rcsM2 === null ? (
              <p className="mt-4 text-11 text-caution">
                No radar cross-section on file. Area-to-mass ratio is unmodelled,
                which is why any Pc estimate against this object carries a wide
                confidence band.
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel
          title="Conjunctions against the fleet"
          meta={`${events.length} active`}
          bodyClassName="overflow-auto"
        >
          {events.length === 0 ? (
            <p className="p-4 text-13 text-fg-dim">
              This object is in the screening catalog but has no active
              conjunctions against the fleet.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Primary</Th>
                  <Th align="right">TCA</Th>
                  <Th align="right">Miss km</Th>
                  <Th align="right">Rel vel km/s</Th>
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
                      <Td>
                        <span className="font-mono text-fg-muted">
                          {c.primaryId}
                        </span>
                        <span className="ml-2">
                          {spacecraftById(c.primaryId).name}
                        </span>
                      </Td>
                      <Td align="right" mono className={SEVERITY_TEXT[sev]}>
                        {formatCountdown(hoursToTca(c, nowMs))}
                      </Td>
                      <Td align="right" mono>
                        {formatKm(c.missDistanceKm)}
                      </Td>
                      <Td align="right" mono className="text-fg-muted">
                        {c.relVelocityKmS.toFixed(2)}
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

        {events.length > 0 ? (
          <p className="px-2 text-11 text-fg-dim">
            Spacecraft:{" "}
            {[...new Set(events.map((c) => c.primaryId))].map((id, i) => (
              <span key={id}>
                {i > 0 ? " · " : ""}
                <RefLink href={`/fleet/${id}`} mono>
                  {id}
                </RefLink>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </Page>
  );
}
