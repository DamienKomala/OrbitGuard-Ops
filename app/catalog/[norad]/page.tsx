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
import {
  ballisticCoefficient,
  j2Rates,
  massFromRcsKg,
  orbitFromAltitudes,
  orbitRegime,
  SUN_SYNC_RATE_DEG_PER_DAY,
} from "@/lib/astro";
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

  // Two-body geometry and J2 secular rates, derived from the catalogued apsides.
  const orbit = orbitFromAltitudes(object.apogeeKm, object.perigeeKm);
  const rates = j2Rates(orbit, object.inclinationDeg);
  const regime = orbitRegime(object.apogeeKm, object.perigeeKm);

  // Mass and drag response inferred from RCS, assuming a spherical aluminium
  // fragment. Crude, and the only option when a catalogue carries no mass.
  const inferredMassKg = object.rcsM2 === null ? null : massFromRcsKg(object.rcsM2);
  const ballisticKgM2 =
    object.rcsM2 === null || inferredMassKg === null
      ? null
      : ballisticCoefficient(inferredMassKg, object.rcsM2);

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

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel
            title="Derived elements"
            meta="two-body · vis-viva"
            bodyClassName="p-4"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="Semi-major axis"
                value={orbit.semiMajorAxisKm.toFixed(1)}
                unit="km"
              />
              <Field
                label="Eccentricity"
                value={orbit.eccentricity.toFixed(5)}
              />
              <Field label="Period" value={orbit.periodMin.toFixed(2)} unit="min" />
              <Field
                label="Mean motion"
                value={orbit.meanMotionRevPerDay.toFixed(4)}
                unit="rev/day"
              />
              <Field
                label="Velocity at perigee"
                value={orbit.velocityPerigeeKmS.toFixed(3)}
                unit="km/s"
              />
              <Field
                label="Velocity at apogee"
                value={orbit.velocityApogeeKmS.toFixed(3)}
                unit="km/s"
              />
            </div>
            <p className="mt-4 border-t border-line pt-4 text-11 text-fg-dim">
              {regime} · computed from the catalogued apsides with μ = 398600.4418
              km³/s² and R⊕ = 6378.137 km (WGS-84).
            </p>
          </Panel>

          <Panel
            title="Secular perturbations"
            meta="J2 oblateness"
            bodyClassName="p-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Nodal regression"
                value={rates.nodalRegressionDegPerDay.toFixed(4)}
                unit="deg/day"
                tone={rates.isSunSynchronous ? "text-accent" : undefined}
              />
              <Field
                label="Apsidal rotation"
                value={rates.apsidalRotationDegPerDay.toFixed(4)}
                unit="deg/day"
              />
            </div>
            <p className="mt-3 text-11 text-fg-dim">
              <span className="font-mono">Ω̇</span> node ·{" "}
              <span className="font-mono">ω̇</span> argument of perigee, secular
              rates from the J2 term.
            </p>
            <p className="mt-4 border-t border-line pt-4 text-11 text-fg-muted">
              {rates.isSunSynchronous ? (
                <>
                  The node regresses at{" "}
                  <span className="font-mono text-fg">
                    {SUN_SYNC_RATE_DEG_PER_DAY.toFixed(4)} deg/day
                  </span>
                  , so this orbit is <span className="text-accent">sun-synchronous</span> —
                  its geometry against the fleet&apos;s own sun-synchronous planes
                  repeats rather than drifting apart, which is why repeat
                  conjunctions with this object are common.
                </>
              ) : (
                <>
                  J2 is the dominant perturbation at this altitude. The plane
                  precesses relative to the fleet&apos;s, so the encounter geometry
                  walks through the catalogue rather than repeating.
                  {Math.abs(object.inclinationDeg - 63.4) < 1.5
                    ? " Inclination is near the 63.4° critical value, where apsidal rotation vanishes."
                    : ""}
                </>
              )}
            </p>
          </Panel>
        </div>

        <Panel
          title="Orbit determination"
          meta={object.propagator === "SP" ? "special perturbations" : "general perturbations"}
          bodyClassName="p-4"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Propagator" value={object.propagator} />
            <Field
              label="Epoch age"
              value={object.epochAgeHours.toFixed(1)}
              unit="h"
              tone={object.epochAgeHours > 12 ? "text-caution" : undefined}
            />
            <Field
              label="Observation arc"
              value={object.observationArcDays.toFixed(1)}
              unit="d"
              tone={object.observationArcDays < 1 ? "text-caution" : undefined}
            />
            <Field
              label="Inferred mass"
              value={inferredMassKg === null ? "—" : inferredMassKg.toFixed(2)}
              unit={inferredMassKg === null ? undefined : "kg"}
              tone={inferredMassKg === null ? "text-fg-dim" : undefined}
            />
            <Field
              label="Ballistic coeff."
              value={ballisticKgM2 === null ? "—" : ballisticKgM2.toFixed(1)}
              unit={ballisticKgM2 === null ? undefined : "kg/m²"}
              tone={ballisticKgM2 === null ? "text-fg-dim" : undefined}
            />
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-13">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-dim">Covariance delivered</dt>
              <dd
                className={
                  object.covariance === "none"
                    ? "text-caution"
                    : "text-fg-muted"
                }
              >
                {object.covariance}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-11 text-fg-muted">
            {object.propagator === "SP"
              ? "Special-perturbations fit — numerically integrated against a full force model, delivered with a covariance the screening pipeline can use directly."
              : "General-perturbations fit — an SGP4 mean-element set. The analytic theory carries no formal covariance, so screening substitutes a modelled one and the resulting Pc is correspondingly softer."}
            {ballisticKgM2 !== null && ballisticKgM2 < 60
              ? " A low ballistic coefficient means atmospheric drag moves this object appreciably between fits, which widens the along-track error faster than tracking narrows it."
              : ""}
            {object.rcsM2 === null
              ? " With no radar cross-section on file, neither mass nor drag response can be inferred at all — the covariance is a floor assumption, not a measurement."
              : ""}
          </p>
        </Panel>

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
