"use client";

import { notFound, useParams } from "next/navigation";
import {
  conjunctionById,
  spacecraftById,
  planFor,
  maneuversForConjunction,
  sourceName,
} from "@/lib/data";
import {
  conjunctionSeverity,
  currentSample,
  formatCountdown,
  formatDuration,
  formatKm,
  formatMinutes,
  formatUtc,
  hoursToDeadline,
  hoursToTca,
  offsetToMs,
  pcTrend,
  SEVERITY_TEXT,
} from "@/lib/format";
import { useMissionClock } from "@/lib/mission-clock";
import { BackLink, Page, RefLink } from "@/components/ui/Page";
import { Field, Panel } from "@/components/ui/Panel";
import { Pc, StatusDot, TrendMark } from "@/components/ui/Readouts";
import { PcHistoryChart } from "@/components/console/PcHistoryChart";
import { ManeuverPlanner } from "@/components/console/ManeuverPlanner";

export default function ConjunctionDetailPage() {
  const params = useParams<{ id: string }>();
  const nowMs = useMissionClock();

  const c = conjunctionById(params.id);
  if (!c) notFound();

  const craft = spacecraftById(c.primaryId);
  const plan = planFor(c.id);
  const severity = conjunctionSeverity(c, nowMs);
  const sample = currentSample(c, nowMs);
  const deadline = hoursToDeadline(c, nowMs);
  const burns = maneuversForConjunction(c.id);

  return (
    <Page
      title={`${c.id} · ${c.secondaryName}`}
      subtitle={`${craft.id} ${craft.name} vs NORAD ${c.secondaryNorad} — ${c.secondaryType.replace("-", " ")}`}
      actions={<BackLink href="/conjunctions" label="All conjunctions" />}
    >
      <div className="grid grid-cols-1 gap-2 px-0 pb-2 xl:grid-cols-[1fr_theme(spacing.planner)]">
        <div className="flex flex-col gap-2">
          {/* Headline state */}
          <Panel>
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
              <Field
                label="Probability of collision"
                value={<Pc value={sample.pc} />}
                tone={SEVERITY_TEXT[severity]}
                size="lg"
              />
              <Field
                label="Time to closest approach"
                value={formatCountdown(hoursToTca(c, nowMs))}
                size="lg"
              />
              <Field
                label="Decision window"
                value={deadline <= 0 ? "closed" : formatDuration(deadline)}
                tone={deadline <= 0 ? "text-fg-dim" : "text-critical"}
                size="lg"
              />
              <Field
                label="Miss distance"
                value={formatKm(c.missDistanceKm)}
                unit="km"
                size="lg"
              />
              <div className="flex flex-col gap-1">
                <span className="eyebrow">State</span>
                <span className="flex items-center gap-2 text-15">
                  <StatusDot severity={severity} />
                  <span className={SEVERITY_TEXT[severity]}>{severity}</span>
                </span>
                <TrendMark trend={pcTrend(c, nowMs)} />
              </div>
            </div>
          </Panel>

          {/* Campaign */}
          <Panel
            title="Screening campaign"
            meta={`${c.cdmCount} CDMs · ±1σ band`}
            bodyClassName="p-2"
          >
            <PcHistoryChart conjunction={c} />
          </Panel>

          {/* Geometry + record */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Panel title="Encounter geometry" bodyClassName="p-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Radial" value={formatKm(c.radialKm)} unit="km" />
                <Field label="In-track" value={formatKm(c.inTrackKm)} unit="km" />
                <Field label="Cross-track" value={formatKm(c.crossTrackKm)} unit="km" />
                <Field
                  label="Relative velocity"
                  value={c.relVelocityKmS.toFixed(2)}
                  unit="km/s"
                />
              </div>
            </Panel>

            <Panel title="Record" bodyClassName="p-4">
              {/* Every identifier here resolves to its own page — the primary,
                  the catalogued secondary, and the network that screened it. */}
              <dl className="space-y-2 text-13">
                {(
                  [
                    [
                      "Primary",
                      <RefLink key="p" href={`/fleet/${craft.id}`} mono>
                        {craft.id} {craft.name}
                      </RefLink>,
                    ],
                    [
                      "Secondary",
                      <RefLink key="s" href={`/catalog/${c.secondaryNorad}`} mono>
                        {c.secondaryNorad}
                      </RefLink>,
                    ],
                    [
                      "Screening source",
                      <RefLink key="src" href={`/sources/${c.sourceId}`}>
                        {sourceName(c.sourceId)}
                      </RefLink>,
                    ],
                    ["Last CDM", `${formatMinutes(c.lastCdmAgeMin)} ago`],
                    ["CDMs received", String(c.cdmCount)],
                    ["TCA (UTC)", formatUtc(offsetToMs(c.tcaOffsetHours))],
                    [
                      "Decision deadline",
                      formatUtc(offsetToMs(c.decisionOffsetHours)),
                    ],
                    [
                      "Secondary RCS",
                      c.secondaryRcsM2 === null
                        ? "uncharacterized"
                        : `${c.secondaryRcsM2.toFixed(3)} m²`,
                    ],
                    ["Current ±1σ", `${sample.sigmaLog10.toFixed(2)} decades`],
                  ] as Array<[string, React.ReactNode]>
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-fg-dim">{k}</dt>
                    <dd className="text-right font-mono text-fg-muted">{v}</dd>
                  </div>
                ))}
              </dl>

              {burns.length > 0 ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="eyebrow mb-2">Burns logged</p>
                  <ul className="space-y-1 text-13">
                    {burns.map((m) => (
                      <li key={m.id} className="flex justify-between gap-4">
                        <RefLink href={`/maneuvers/${m.id}`} mono>
                          {m.id}
                        </RefLink>
                        <span className="font-mono text-fg-muted">
                          {m.deltaVMs.toFixed(2)} m/s · {m.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          </div>
        </div>

        <Panel
          title="Maneuver planner"
          meta={plan ? `${plan.downstream.length} downstream` : undefined}
          bodyClassName="overflow-hidden"
        >
          <ManeuverPlanner conjunction={c} />
        </Panel>
      </div>
    </Page>
  );
}
