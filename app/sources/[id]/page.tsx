"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { CONJUNCTIONS, sourceById, sourceSeverity } from "@/lib/data";
import {
  conjunctionSeverity,
  currentPc,
  formatCountdown,
  formatMinutes,
  hoursToTca,
  SEVERITY_BG,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { BackLink, Page } from "@/components/ui/Page";
import { encounterRegime } from "@/lib/astro";
import { Field, Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Pc, StatusDot } from "@/components/ui/Readouts";
import { cn } from "@/lib/cn";

const KIND_NOTE: Record<string, string> = {
  radar: "Radar tracks are weather-independent and give the tightest along-track covariance, which is why they dominate short-notice screening.",
  optical:
    "Optical tracks depend on twilight geometry and clear sky, so gaps are expected and a missed window shows up as a widening band.",
  commercial:
    "A fused product — this network blends its own observations with public catalogue data, so its cadence is more regular than any single sensor.",
  onboard:
    "GNSS ephemeris downlinked from the fleet itself. This is the primary state for every OrbitGuard spacecraft; catalogue data covers only the secondary.",
};

export default function SourceDetailPage() {
  const params = useParams<{ id: string }>();
  const nowMs = useMissionClock();
  const router = useRouter();

  const source = sourceById(params.id);
  if (!source) notFound();

  const severity = sourceSeverity(source);
  const ratio = source.ageMin / source.cadenceMin;
  const events = CONJUNCTIONS.filter((c) => c.sourceId === source.id);

  return (
    <Page
      title={source.name}
      subtitle={`${source.kind} · ${source.coverage}`}
      actions={<BackLink href="/sources" label="All sources" />}
    >
      <div className="flex flex-col gap-2 pb-2">
        <Panel>
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field
              label="Last delivery"
              value={formatMinutes(source.ageMin)}
              tone={SEVERITY_TEXT[severity]}
              size="lg"
            />
            <Field
              label="Expected cadence"
              value={formatMinutes(source.cadenceMin)}
              size="lg"
            />
            <Field
              label="Objects tracked"
              value={source.objectsTracked.toLocaleString("en-US")}
              size="lg"
            />
            <Field
              label="Observations 24h"
              value={source.observationsLast24h.toLocaleString("en-US")}
              size="lg"
            />
            <div className="flex flex-col gap-1">
              <span className="eyebrow">State</span>
              <span className="flex items-center gap-2 text-20">
                <StatusDot severity={severity} />
                <span className={SEVERITY_TEXT[severity]}>{severity}</span>
              </span>
            </div>
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-2 flex items-baseline justify-between text-11">
              <span className="eyebrow">Age against cadence</span>
              <span className="font-mono text-fg-dim">
                {(ratio * 100).toFixed(0)}%
              </span>
            </div>
            {/* Freshness is measured against this network's own interval, not a
                wall clock — an eight-hour feed is not late at 46 minutes. */}
            <div className="h-1.5 w-full rounded-sm bg-panel-alt">
              <div
                className={cn("h-full rounded-sm", SEVERITY_BG[severity])}
                style={{ width: `${Math.min(ratio, 1) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-11 text-fg-dim">
              {ratio <= 1
                ? `${Math.round((1 - ratio) * 100)}% of the delivery interval remaining.`
                : `${formatMinutes(source.ageMin - source.cadenceMin)} past due. Estimates sourced here are ageing faster than they are being refreshed.`}
            </p>
          </div>
        </Panel>

        <Panel
          title="Observation and orbit determination"
          meta={source.dataProduct}
          bodyClassName="p-4"
        >
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="Fit span"
              value={source.fitSpanHours.toFixed(0)}
              unit="h"
            />
            <Field
              label="1σ position"
              value={source.positionSigmaM.toFixed(0)}
              unit="m"
              tone={
                source.positionSigmaM > 300
                  ? "text-caution"
                  : source.positionSigmaM < 100
                    ? "text-nominal"
                    : undefined
              }
            />
            <Field
              label="Observations 24h"
              value={source.observationsLast24h.toLocaleString("en-US")}
            />
            <Field
              label="Obs per object"
              value={(source.observationsLast24h / source.objectsTracked).toFixed(1)}
            />
          </div>

          <dl className="space-y-2 border-t border-line pt-4 text-13">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-fg-dim">Measurement types</dt>
              <dd className="text-right text-fg-muted">
                {source.observationTypes.join(" · ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-fg-dim">Delivered product</dt>
              <dd className="text-right font-mono text-fg-muted">
                {source.dataProduct}
              </dd>
            </div>
          </dl>

          <p className="mt-4 max-w-[76ch] text-13 text-fg-muted">
            {KIND_NOTE[source.kind]}
          </p>

          <p className="mt-3 max-w-[76ch] text-11 text-fg-muted">
            {/* What the measurement set implies for the covariance the
                screening pipeline receives. */}
            {source.observationTypes.some((o) => o.includes("range-rate"))
              ? "Range-rate observations constrain the along-track component directly, which is the axis that dominates conjunction covariance — this is the strongest orbit determination in the network."
              : source.observationTypes.some((o) => o.includes("range"))
                ? "Range and angles constrain radial position well but leave along-track error to be inferred from arc length, so the covariance ellipsoid stays elongated along the velocity vector."
                : "Angles-only tracking leaves range unconstrained. The fit relies on arc curvature, so the along-track uncertainty is the largest term by an order of magnitude and stays that way until a ranging sensor tasks the object."}
            {source.fitSpanHours < 48
              ? " A short fit span compounds this — there is not enough arc to separate drag from geometry."
              : ""}
          </p>
        </Panel>

        <Panel
          title="Conjunctions screened by this source"
          meta={`${events.length} active`}
          bodyClassName="overflow-auto"
        >
          {events.length === 0 ? (
            <p className="p-4 text-13 text-fg-dim">
              No active conjunctions are currently sourced from this network.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Primary</Th>
                  <Th>Secondary</Th>
                  <Th align="right">TCA</Th>
                  <Th align="right">Last CDM</Th>
                  <Th align="right">CDMs</Th>
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
                      <Td mono className="text-fg-muted">
                        {c.primaryId}
                      </Td>
                      <Td>
                        {c.secondaryName}
                        <span className="ml-2 font-mono text-11 text-fg-dim">
                          {c.secondaryNorad}
                        </span>
                      </Td>
                      <Td align="right" mono className={SEVERITY_TEXT[sev]}>
                        {formatCountdown(hoursToTca(c, nowMs))}
                      </Td>
                      <Td align="right" mono className="text-fg-muted">
                        {formatMinutes(c.lastCdmAgeMin)} ago
                      </Td>
                      <Td align="right" mono className="text-fg-dim">
                        {c.cdmCount}
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

          {events.length > 0 ? (
            <p className="border-t border-line p-4 text-11 text-fg-muted">
              {(() => {
                const slowest = events.reduce((a, b) =>
                  a.relVelocityKmS < b.relVelocityKmS ? a : b
                );
                const regime = encounterRegime(slowest.relVelocityKmS);
                return (
                  <>
                    Slowest encounter sourced here is{" "}
                    <span className="font-mono text-fg">
                      {slowest.relVelocityKmS.toFixed(2)} km/s
                    </span>{" "}
                    ({regime.label}). {regime.note}
                  </>
                );
              })()}
            </p>
          ) : null}
        </Panel>
      </div>
    </Page>
  );
}
