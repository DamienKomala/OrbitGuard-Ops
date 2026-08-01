"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOURCES, sourceSeverity } from "@/lib/data";
import { formatMinutes, SEVERITY_BG, SEVERITY_TEXT } from "@/lib/format";
import { Page } from "@/components/ui/Page";
import { Field, Panel } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/Readouts";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { cn } from "@/lib/cn";

export default function SourcesPage() {
  const router = useRouter();
  const degraded = SOURCES.filter((s) => sourceSeverity(s) !== "nominal");

  return (
    <Page
      title="Sources"
      subtitle={
        degraded.length === 0
          ? "All tracking networks delivering within cadence"
          : `${degraded.length} of ${SOURCES.length} networks past expected cadence`
      }
    >
      <div className="flex flex-col gap-2 pb-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((s) => {
            const severity = sourceSeverity(s);
            const ratio = s.ageMin / s.cadenceMin;
            return (
              <Panel key={s.id} bodyClassName="p-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-15">
                      <Link
                        href={`/sources/${s.id}`}
                        className="text-fg transition-colors hover:text-accent"
                      >
                        {s.name}
                      </Link>
                    </h2>
                    <p className="text-11 text-fg-dim">
                      {s.kind} · {s.coverage}
                    </p>
                  </div>
                  <StatusDot severity={severity} className="mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Last delivery"
                    value={formatMinutes(s.ageMin)}
                    tone={SEVERITY_TEXT[severity]}
                  />
                  <Field label="Cadence" value={formatMinutes(s.cadenceMin)} />
                </div>

                <div className="mt-4 h-1 w-full rounded-sm bg-panel-alt">
                  <div
                    className={cn("h-full rounded-sm", SEVERITY_BG[severity])}
                    style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-11 text-fg-dim">
                  {ratio <= 1
                    ? `${Math.round((1 - ratio) * 100)}% of interval remaining`
                    : `${formatMinutes(s.ageMin - s.cadenceMin)} past due`}
                </p>
              </Panel>
            );
          })}
        </div>

        <Panel title="Coverage" bodyClassName="overflow-auto">
          <Table>
            <thead>
              <tr>
                <Th>Network</Th>
                <Th>Kind</Th>
                <Th>Coverage</Th>
                <Th align="right">Objects tracked</Th>
                <Th align="right">Observations 24h</Th>
                <Th align="right">Age</Th>
                <Th align="right">Cadence</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => {
                const severity = sourceSeverity(s);
                return (
                  <Tr key={s.id} onClick={() => router.push(`/sources/${s.id}`)}>
                    <Td className="text-fg">{s.name}</Td>
                    <Td className="text-fg-muted">{s.kind}</Td>
                    <Td className="text-fg-muted">{s.coverage}</Td>
                    <Td align="right" mono>
                      {s.objectsTracked.toLocaleString("en-US")}
                    </Td>
                    <Td align="right" mono className="text-fg-muted">
                      {s.observationsLast24h.toLocaleString("en-US")}
                    </Td>
                    <Td align="right" mono className={SEVERITY_TEXT[severity]}>
                      {formatMinutes(s.ageMin)}
                    </Td>
                    <Td align="right" mono className="text-fg-dim">
                      {formatMinutes(s.cadenceMin)}
                    </Td>
                    <Td className={SEVERITY_TEXT[severity]}>{severity}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      </div>
    </Page>
  );
}
