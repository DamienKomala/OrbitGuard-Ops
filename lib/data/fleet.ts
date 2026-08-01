import type { Spacecraft } from "./types";

/**
 * The scenario anchor. Everything time-based in the product is an offset from
 * this instant, which is what lets the data stay static while countdowns run
 * live. The server renders exactly here, so hydration matches.
 */
export const SCENARIO_EPOCH = "2026-08-01T14:32:00.000Z";
export const SCENARIO_EPOCH_MS = Date.parse(SCENARIO_EPOCH);

export const FLEET: Spacecraft[] = [
  {
    id: "OG-1",
    name: "Meridian-1",
    norad: "58412",
    bus: "ESPA-Grande / hydrazine",
    launchedIso: "2024-03-14",
    altitudeKm: 512,
    inclinationDeg: 97.4,
    periodMin: 94.8,
    propellantKg: 6.14,
    propellantCapacityKg: 12.4,
    reserveKg: 2.2,
    deltaVRemainingMs: 49.2,
    annualStationKeepingKg: 1.9,
    status: "nominal",
  },
  {
    id: "OG-2",
    name: "Meridian-2",
    norad: "58413",
    bus: "ESPA-Grande / hydrazine",
    launchedIso: "2024-03-14",
    altitudeKm: 514,
    inclinationDeg: 97.4,
    periodMin: 94.9,
    propellantKg: 4.82,
    propellantCapacityKg: 12.4,
    reserveKg: 2.2,
    deltaVRemainingMs: 38.6,
    annualStationKeepingKg: 1.9,
    status: "critical",
  },
  {
    id: "OG-3",
    name: "Sentinel-A",
    norad: "59120",
    bus: "SmallSat-200 / xenon",
    launchedIso: "2024-11-02",
    altitudeKm: 548,
    inclinationDeg: 53.0,
    periodMin: 95.6,
    propellantKg: 3.41,
    propellantCapacityKg: 5.0,
    reserveKg: 0.8,
    deltaVRemainingMs: 112.4,
    annualStationKeepingKg: 0.4,
    status: "caution",
  },
  {
    id: "OG-4",
    name: "Sentinel-B",
    norad: "59121",
    bus: "SmallSat-200 / xenon",
    launchedIso: "2024-11-02",
    altitudeKm: 547,
    inclinationDeg: 53.0,
    periodMin: 95.6,
    propellantKg: 3.66,
    propellantCapacityKg: 5.0,
    reserveKg: 0.8,
    deltaVRemainingMs: 120.7,
    annualStationKeepingKg: 0.4,
    status: "nominal",
  },
  {
    id: "OG-5",
    name: "Halcyon",
    norad: "60233",
    bus: "ESPA-Grande / hydrazine",
    launchedIso: "2025-06-21",
    altitudeKm: 705,
    inclinationDeg: 98.2,
    periodMin: 98.8,
    propellantKg: 9.88,
    propellantCapacityKg: 12.4,
    reserveKg: 2.2,
    deltaVRemainingMs: 79.1,
    annualStationKeepingKg: 1.1,
    status: "caution",
  },
  {
    id: "OG-6",
    name: "Kestrel",
    norad: "61044",
    bus: "CubeSat-12U / cold gas",
    launchedIso: "2026-01-18",
    altitudeKm: 495,
    inclinationDeg: 97.3,
    periodMin: 94.5,
    propellantKg: 0.62,
    propellantCapacityKg: 1.1,
    reserveKg: 0.2,
    deltaVRemainingMs: 8.4,
    annualStationKeepingKg: 0.3,
    status: "nominal",
  },
];

export function spacecraftById(id: string): Spacecraft {
  const found = FLEET.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spacecraft: ${id}`);
  return found;
}
