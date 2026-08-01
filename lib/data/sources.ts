import type { Severity, TrackingSource } from "./types";

export const SOURCES: TrackingSource[] = [
  {
    id: "ssn",
    name: "18 SDS · Space-Track",
    kind: "radar",
    ageMin: 46,
    cadenceMin: 480,
    objectsTracked: 47214,
    observationsLast24h: 1240000,
    coverage: "Global SSN",
    observationTypes: ["range", "azimuth", "elevation"],
    fitSpanHours: 72,
    positionSigmaM: 250,
    dataProduct: "CCSDS CDM + TLE (GP)",
  },
  {
    id: "leolabs",
    name: "LeoLabs Radar Network",
    kind: "radar",
    ageMin: 12,
    cadenceMin: 90,
    objectsTracked: 21860,
    observationsLast24h: 486000,
    coverage: "LEO 200–2000 km",
    observationTypes: ["range", "range-rate", "azimuth", "elevation"],
    fitSpanHours: 48,
    positionSigmaM: 65,
    dataProduct: "CCSDS CDM + SP ephemeris (OEM)",
  },
  {
    id: "comspoc",
    name: "COMSPOC ASTRIAGraph",
    kind: "commercial",
    ageMin: 31,
    cadenceMin: 180,
    objectsTracked: 28450,
    observationsLast24h: 610000,
    coverage: "Fused multi-source",
    observationTypes: ["fused range", "angles", "operator ephemeris"],
    fitSpanHours: 96,
    positionSigmaM: 90,
    dataProduct: "CCSDS CDM + OEM",
  },
  {
    id: "slingshot",
    name: "Slingshot Optical",
    kind: "optical",
    ageMin: 74,
    cadenceMin: 60,
    objectsTracked: 9412,
    observationsLast24h: 118000,
    coverage: "GEO + LEO twilight",
    observationTypes: ["right ascension", "declination"],
    fitSpanHours: 36,
    positionSigmaM: 480,
    dataProduct: "CCSDS CDM",
  },
  {
    id: "esa-sst",
    name: "ESA SST",
    kind: "radar",
    ageMin: 214,
    cadenceMin: 120,
    objectsTracked: 6108,
    observationsLast24h: 42000,
    coverage: "European sensor network",
    observationTypes: ["range", "azimuth", "elevation"],
    fitSpanHours: 60,
    positionSigmaM: 310,
    dataProduct: "CCSDS CDM",
  },
  {
    id: "onboard",
    name: "Fleet GNSS Downlink",
    kind: "onboard",
    ageMin: 1,
    cadenceMin: 5,
    objectsTracked: 6,
    observationsLast24h: 8640,
    coverage: "OrbitGuard fleet ephemeris",
    observationTypes: ["GNSS pseudorange", "carrier phase"],
    fitSpanHours: 24,
    positionSigmaM: 8,
    dataProduct: "CCSDS OEM (operator ephemeris)",
  },
];

/**
 * Freshness is age measured against that network's own cadence, not against a
 * wall clock. A source that delivers every eight hours is not stale at 46
 * minutes; an optical feed on a one-hour cadence is.
 */
export function sourceSeverity(source: TrackingSource): Severity {
  const ratio = source.ageMin / source.cadenceMin;
  if (ratio > 1.75) return "critical";
  if (ratio > 1) return "caution";
  return "nominal";
}

export function sourceById(id: string): TrackingSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Display name for a source id, falling back to the id if it is unknown. */
export function sourceName(id: string): string {
  return sourceById(id)?.name ?? id;
}
