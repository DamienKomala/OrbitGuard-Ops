"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  conjunctionById,
  maneuverById,
  planFor,
  spacecraftById,
  type ManeuverStatus,
} from "@/lib/data";
import {
  formatDuration,
  formatUtc,
  offsetToMs,
} from "@/lib/format";
import {
  bPlaneProjection,
  burnDurationS,
  burnResponse,
  deltaVAvailableMs,
  orbitFromAltitudes,
  propellantForBurnKg,
} from "@/lib/astro";
import { BackLink, Page, RefLink } from "@/components/ui/Page";
import { Field, Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { Pc } from "@/components/ui/Readouts";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<ManeuverStatus, string> = {
  proposed: "text-accent",
  committed: "text-caution",
  executed: "text-nominal",
  declined: "text-fg-dim",
  expired: "text-critical",
};

const STATUS_NOTE: Record<ManeuverStatus, string> = {
  proposed: "Solution generated. No operator has committed it.",
  committed: "Approved and queued for upload on the next contact.",
  executed: "Burn performed. Post-burn state vector confirmed by tracking.",
  declined: "Reviewed and rejected — the estimate did not justify the propellant.",
  expired: "The decision deadline passed before anyone committed.",
};

const EFFECT_STYLE = {
  resolved: { label: "resolved", tone: "text-nominal", bar: "bg-nominal" },
  improved: { label: "improved", tone: "text-nominal", bar: "bg-nominal" },
  created: { label: "created", tone: "text-caution", bar: "bg-caution" },
  worsened: { label: "worsened", tone: "text-critical", bar: "bg-critical" },
} as const;

export default function ManeuverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const burn = maneuverById(params.id);
  if (!burn) notFound();

  const craft = spacecraftById(burn.spacecraftId);
  // Historical burns reference conjunctions that have since cleared, so the
  // event and its plan may both be gone. Everything below degrades to the
  // record itself when that happens.
  const conjunction = conjunctionById(burn.conjunctionId);
  const plan = planFor(burn.conjunctionId);
  const past = burn.offsetHours < 0;

  /*
   * Orbit response to the burn, from Gauss's variational equations and the
   * Clohessy-Wiltshire secular drift term. Lead time is burn to TCA — the
   * quantity that actually buys miss distance, since an in-track burn separates
   * the objects by letting a period change accumulate rather than by moving the
   * spacecraft at the moment it fires.
   */
  const orbit = orbitFromAltitudes(craft.altitudeKm, craft.altitudeKm);
  const leadHours = conjunction
    ? conjunction.tcaOffsetHours - burn.offsetHours
    : 0;
  const response = burnResponse(
    orbit,
    burn.axis,
    burn.deltaVMs,
    Math.max(0, leadHours) * 3600
  );
  const bPlane = conjunction && plan
    ? bPlaneProjection(
        response.alongTrackDriftKm,
        conjunction.missDistanceKm,
        plan.missDistanceAfterKm
      )
    : null;

  const dryMassKg = craft.wetMassKg - craft.propellantCapacityKg;
  const currentMassKg = dryMassKg + craft.propellantKg;
  const modelPropellantKg = propellantForBurnKg(
    currentMassKg,
    burn.deltaVMs,
    craft.ispS
  );
  const modelDurationS = burnDurationS(
    currentMassKg,
    burn.deltaVMs,
    craft.thrustN
  );
  const usableKg = craft.propellantKg - craft.reserveKg;
  const burnsRemaining = Math.floor(usableKg / Math.max(modelPropellantKg, 1e-9));
  const deltaVRemaining = deltaVAvailableMs(currentMassKg, usableKg, craft.ispS);

  return (
    <Page
      title={`${burn.id} · ${burn.secondaryName}`}
      subtitle={`${craft.id} ${craft.name} — ${burn.axis} burn, ${burn.status}`}
      actions={<BackLink href="/maneuvers" label="All maneuvers" />}
    >
      <div className="flex flex-col gap-2 pb-2">
        <Panel>
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Delta-v" value={burn.deltaVMs.toFixed(2)} unit="m/s" size="lg" />
            <Field
              label="Propellant"
              value={burn.propellantKg.toFixed(3)}
              unit="kg"
              size="lg"
            />
            <Field label="Axis" value={burn.axis} size="lg" />
            <Field
              label={past ? "Executed" : "Scheduled"}
              value={
                past
                  ? `${formatDuration(burn.offsetHours)} ago`
                  : `in ${formatDuration(burn.offsetHours)}`
              }
              size="lg"
            />
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Status</span>
              <span className={cn("font-mono text-20", STATUS_TONE[burn.status])}>
                {burn.status}
              </span>
            </div>
          </div>
          <p className="border-t border-line px-4 py-3 text-13 text-fg-muted">
            {STATUS_NOTE[burn.status]}
          </p>
        </Panel>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel title="Effect on the event" bodyClassName="p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Pc before</span>
                <Pc value={burn.pcBefore} className="text-20 text-critical" />
              </div>
              <ArrowRight className="size-4 text-fg-dim" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Pc after</span>
                <Pc value={burn.pcAfter} className="text-20 text-nominal" />
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-13">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Conjunction</dt>
                <dd>
                  {conjunction ? (
                    <RefLink href={`/conjunctions/${burn.conjunctionId}`} mono>
                      {burn.conjunctionId}
                    </RefLink>
                  ) : (
                    <span className="font-mono text-fg-dim">
                      {burn.conjunctionId} (cleared)
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Spacecraft</dt>
                <dd>
                  <RefLink href={`/fleet/${craft.id}`} mono>
                    {craft.id} {craft.name}
                  </RefLink>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Secondary</dt>
                <dd className="text-fg-muted">{burn.secondaryName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Operator</dt>
                <dd className="font-mono text-fg-muted">{burn.operator}</dd>
              </div>
              {plan ? (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-dim">Burn time</dt>
                    <dd className="font-mono text-fg-muted">
                      {formatUtc(offsetToMs(plan.burnOffsetHours))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-dim">Upload pass</dt>
                    <dd className="font-mono text-fg-muted">
                      {plan.uploadStation}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-dim">Duration</dt>
                    <dd className="font-mono text-fg-muted">{plan.durationS} s</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </Panel>

          <Panel title="Propellant cost" bodyClassName="p-4">
            <div className="mb-4 grid grid-cols-3 gap-4">
              <Field
                label="This burn"
                value={burn.propellantKg.toFixed(3)}
                unit="kg"
                tone="text-caution"
              />
              <Field
                label="Remaining"
                value={craft.propellantKg.toFixed(2)}
                unit="kg"
              />
              <Field
                label="SK runway"
                value={(
                  (craft.propellantKg - craft.reserveKg) /
                  craft.annualStationKeepingKg
                ).toFixed(1)}
                unit="yr"
              />
            </div>
            <BudgetBar
              capacityKg={craft.propellantCapacityKg}
              remainingKg={craft.propellantKg}
              burnKg={past ? 0 : burn.propellantKg}
              reserveKg={craft.reserveKg}
            />
            {past ? (
              <p className="mt-3 text-11 text-fg-dim">
                Already drawn down — the remaining figure above is post-burn.
              </p>
            ) : null}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Panel
            title="Orbit response"
            meta="Gauss variational · Clohessy–Wiltshire"
            bodyClassName="p-4"
          >
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="Δ semi-major axis"
                value={
                  response.deltaSemiMajorAxisKm === 0
                    ? "0"
                    : (response.deltaSemiMajorAxisKm * 1000).toFixed(1)
                }
                unit="m"
              />
              <Field
                label="Δ period"
                value={response.deltaPeriodS.toFixed(3)}
                unit="s"
              />
              <Field
                label={burn.axis === "cross-track" ? "Δ inclination" : "Δ eccentricity"}
                value={
                  burn.axis === "cross-track"
                    ? response.deltaInclinationDeg.toExponential(1)
                    : response.deltaEccentricity.toExponential(1)
                }
                unit={burn.axis === "cross-track" ? "deg" : undefined}
              />
            </div>

            {burn.axis === "in-track" ? (
              <div className="border-t border-line pt-4">
                <div className="mb-3 grid grid-cols-2 gap-4">
                  <Field
                    label="Drift per orbit"
                    value={response.driftPerOrbitKm.toFixed(3)}
                    unit="km"
                  />
                  <Field
                    label={`Along-track at TCA (${leadHours.toFixed(1)}h lead)`}
                    value={response.alongTrackDriftKm.toFixed(2)}
                    unit="km"
                    tone="text-accent"
                  />
                </div>
                <p className="text-11 text-fg-muted">
                  An in-track burn separates by changing the orbital period, so
                  displacement grows as{" "}
                  <span className="font-mono text-fg">Δx = 3·Δv·t</span>. Lead
                  time, not delta-v, is what buys miss distance — the same burn
                  an hour later is worth proportionally less.
                </p>
              </div>
            ) : (
              <p className="border-t border-line pt-4 text-11 text-fg-muted">
                {burn.axis === "cross-track"
                  ? "A cross-track burn rotates the orbit plane rather than changing the period, so separation appears immediately at the burn point rather than accumulating."
                  : "A radial burn changes eccentricity without changing the period to first order, so it produces no secular along-track drift."}
              </p>
            )}

            {bPlane && bPlane.factor > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="eyebrow">B-plane projection</span>
                  <span className="font-mono text-13 text-fg">
                    {(bPlane.factor * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-11 text-fg-muted">
                  Only the component of that displacement perpendicular to the{" "}
                  <span className="font-mono text-fg">
                    {conjunction?.relVelocityKmS.toFixed(2)} km/s
                  </span>{" "}
                  relative velocity lies in the encounter plane and changes miss
                  distance; the rest changes arrival time. At{" "}
                  <span className="font-mono text-fg">
                    {bPlane.angleDeg.toFixed(1)}°
                  </span>{" "}
                  off the relative-velocity vector,{" "}
                  <span className="font-mono text-fg">
                    {response.alongTrackDriftKm.toFixed(1)} km
                  </span>{" "}
                  of drift becomes{" "}
                  <span className="font-mono text-fg">
                    {(plan
                      ? plan.missDistanceAfterKm - conjunction!.missDistanceKm
                      : 0
                    ).toFixed(2)}{" "}
                    km
                  </span>{" "}
                  of additional separation.
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Propulsion" meta="Tsiolkovsky" bodyClassName="p-4">
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Specific impulse" value={String(craft.ispS)} unit="s" />
              <Field label="Thrust" value={craft.thrustN.toFixed(3)} unit="N" />
              <Field
                label="Vehicle mass"
                value={currentMassKg.toFixed(1)}
                unit="kg"
              />
              <Field
                label="Propellant"
                value={modelPropellantKg.toFixed(4)}
                unit="kg"
              />
              <Field
                label="Burn duration"
                value={modelDurationS.toFixed(0)}
                unit="s"
              />
              <Field
                label="Mass fraction"
                value={(modelPropellantKg / currentMassKg).toExponential(1)}
              />
            </div>

            <dl className="space-y-2 border-t border-line pt-4 text-13">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">System</dt>
                <dd className="text-right text-fg-muted">{craft.propulsion}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Δv capability remaining</dt>
                <dd className="text-right font-mono text-fg-muted">
                  {deltaVRemaining.toFixed(1)} m/s
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-dim">Avoidance burns of this size left</dt>
                <dd className="text-right font-mono text-fg">
                  {burnsRemaining.toLocaleString("en-US")}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-11 text-fg-muted">
              {craft.thrustN < 0.1
                ? "Low-thrust system — the burn spans a meaningful fraction of an orbit, so it is modelled as finite rather than impulsive and the achieved delta-v is direction-averaged."
                : "Burn is short relative to the orbital period, so the impulsive approximation used above holds."}
            </p>
          </Panel>
        </div>

        <Panel
          title="Downstream conjunctions"
          meta={plan ? `${plan.downstream.length} affected` : "not modelled"}
          bodyClassName="overflow-auto"
        >
          {!plan ? (
            <p className="p-4 text-13 text-fg-dim">
              No downstream screening on file for this burn. Historical burns
              retain their record but not the re-screening that followed.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Secondary</Th>
                  <Th align="right">TCA</Th>
                  <Th align="right">Pc before</Th>
                  <Th align="right">Pc after</Th>
                  <Th>Effect</Th>
                </tr>
              </thead>
              <tbody>
                {plan.downstream.map((d) => {
                  const style = EFFECT_STYLE[d.effect];
                  const exists = Boolean(conjunctionById(d.conjunctionId));
                  return (
                    <Tr
                      key={d.conjunctionId}
                      onClick={
                        exists
                          ? () => router.push(`/conjunctions/${d.conjunctionId}`)
                          : undefined
                      }
                    >
                      <Td mono>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn("size-[6px] rounded-full", style.bar)}
                            aria-hidden="true"
                          />
                          {d.conjunctionId}
                        </span>
                      </Td>
                      <Td>
                        {d.secondaryName}
                        <span className="ml-2 font-mono text-11 text-fg-dim">
                          {d.secondaryNorad}
                        </span>
                      </Td>
                      <Td align="right" mono className="text-fg-muted">
                        T+{d.tcaOffsetHours.toFixed(1)}h
                      </Td>
                      <Td align="right">
                        {d.pcBefore > 0 ? (
                          <Pc value={d.pcBefore} className="text-fg-muted" />
                        ) : (
                          <span className="text-fg-dim">—</span>
                        )}
                      </Td>
                      <Td align="right">
                        <Pc value={d.pcAfter} className={style.tone} />
                      </Td>
                      <Td className={style.tone}>{style.label}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </Page>
  );
}
