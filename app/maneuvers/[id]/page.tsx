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
