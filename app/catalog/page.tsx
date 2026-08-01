"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CATALOG } from "@/lib/data";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";

export default function CatalogPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.norad.includes(q) ||
        o.origin.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Page
      title="Catalog"
      subtitle={`${CATALOG.length} tracked objects currently screening against the fleet`}
      actions={
        <div className="flex h-8 w-full items-center gap-2 rounded-md border border-line px-2.5 sm:w-auto">
          <Search className="size-3.5 text-fg-dim" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, NORAD, or origin"
            aria-label="Filter catalog"
            className="w-full min-w-0 bg-transparent text-13 text-fg outline-none placeholder:text-fg-dim sm:w-[264px]"
          />
        </div>
      }
    >
      <Panel bodyClassName="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>NORAD</Th>
              <Th>Designation</Th>
              <Th>Type</Th>
              <Th align="right">RCS m²</Th>
              <Th align="right">Apogee km</Th>
              <Th align="right">Perigee km</Th>
              <Th align="right">Incl °</Th>
              <Th align="right">Active events</Th>
              <Th>Origin</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <Tr key={o.norad} onClick={() => router.push(`/catalog/${o.norad}`)}>
                <Td mono>{o.norad}</Td>
                <Td className="text-fg">{o.name}</Td>
                <Td className="text-fg-muted">{o.type.replace("-", " ")}</Td>
                <Td align="right" mono className={o.rcsM2 === null ? "text-fg-dim" : ""}>
                  {o.rcsM2 === null ? "—" : o.rcsM2.toFixed(3)}
                </Td>
                <Td align="right" mono>
                  {o.apogeeKm}
                </Td>
                <Td align="right" mono>
                  {o.perigeeKm}
                </Td>
                <Td align="right" mono>
                  {o.inclinationDeg.toFixed(1)}
                </Td>
                <Td
                  align="right"
                  mono
                  className={o.activeConjunctions > 0 ? "text-caution" : "text-fg-dim"}
                >
                  {o.activeConjunctions}
                </Td>
                <Td className="text-fg-dim">{o.origin}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </Page>
  );
}
