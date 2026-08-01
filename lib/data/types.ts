export type Severity = "nominal" | "caution" | "critical";

/** Screening thresholds. Everything that assigns severity reads these. */
export const PC_ACTION_THRESHOLD = 1e-4;
export const PC_SCREENING_FLOOR = 1e-5;

/**
 * One estimate of Pc, as produced at a point in the screening campaign.
 *
 * `sigmaLog10` is the 1σ uncertainty expressed in decades, which is how the
 * confidence band gets its width: the band spans pc × 10^±σ. It shrinks as
 * tracking data accumulates, which is the entire argument the timeline makes.
 */
export type PcSample = {
  /** Hours before TCA at which this estimate was produced. Descends to 0. */
  tMinusHours: number;
  pc: number;
  sigmaLog10: number;
};

export type ObjectType = "debris" | "payload" | "rocket-body" | "unknown";

export type Conjunction = {
  id: string;
  /** Spacecraft id from the fleet. */
  primaryId: string;
  secondaryNorad: string;
  secondaryName: string;
  secondaryType: ObjectType;
  /** Radar cross-section, m². Null when the object is uncharacterized. */
  secondaryRcsM2: number | null;

  /** Hours from SCENARIO_EPOCH to time of closest approach. */
  tcaOffsetHours: number;
  /**
   * Hours from SCENARIO_EPOCH to the last moment a burn can be committed.
   * Always earlier than TCA by the command-upload and propagation lead time.
   */
  decisionOffsetHours: number;

  missDistanceKm: number;
  /** Radial / in-track / cross-track components of the miss, km. */
  radialKm: number;
  inTrackKm: number;
  crossTrackKm: number;
  relVelocityKmS: number;

  /** Full 72h screening campaign. Samples at or before now are observed. */
  pcSeries: PcSample[];

  /** References TrackingSource.id — a real link, not a display string. */
  sourceId: string;
  /** Minutes since the most recent CDM for this event. */
  lastCdmAgeMin: number;
  cdmCount: number;
};

export type Spacecraft = {
  id: string;
  name: string;
  norad: string;
  bus: string;
  launchedIso: string;
  altitudeKm: number;
  inclinationDeg: number;
  periodMin: number;

  propellantKg: number;
  propellantCapacityKg: number;
  /** Propellant that must survive to end of mission — burns may not cross it. */
  reserveKg: number;
  deltaVRemainingMs: number;
  /** Station-keeping draw, kg per year, for runway math. */
  annualStationKeepingKg: number;

  status: Severity;
};

export type BurnAxis = "radial" | "in-track" | "cross-track";

export type DownstreamEffect = {
  conjunctionId: string;
  secondaryName: string;
  secondaryNorad: string;
  tcaOffsetHours: number;
  effect: "resolved" | "improved" | "created" | "worsened";
  pcBefore: number;
  pcAfter: number;
};

export type ManeuverPlan = {
  conjunctionId: string;
  spacecraftId: string;
  /** Hours from SCENARIO_EPOCH to burn execution. */
  burnOffsetHours: number;
  deltaVMs: number;
  axis: BurnAxis;
  propellantKg: number;
  durationS: number;

  pcAfter: number;
  missDistanceAfterKm: number;
  /** Ground-station pass the command would upload on. */
  uploadStation: string;
  uploadOffsetHours: number;

  downstream: DownstreamEffect[];
};

export type ManeuverStatus =
  | "proposed"
  | "committed"
  | "executed"
  | "declined"
  | "expired";

export type ManeuverRecord = {
  id: string;
  spacecraftId: string;
  conjunctionId: string;
  secondaryName: string;
  /** Hours from SCENARIO_EPOCH. Negative for past burns. */
  offsetHours: number;
  deltaVMs: number;
  axis: BurnAxis;
  propellantKg: number;
  status: ManeuverStatus;
  pcBefore: number;
  pcAfter: number;
  operator: string;
};

export type SourceKind = "radar" | "optical" | "commercial" | "onboard";

export type TrackingSource = {
  id: string;
  name: string;
  kind: SourceKind;
  /** Minutes since last delivery. */
  ageMin: number;
  /** Expected delivery interval, minutes. Freshness is age against this. */
  cadenceMin: number;
  objectsTracked: number;
  observationsLast24h: number;
  coverage: string;
};

export type CatalogObject = {
  norad: string;
  name: string;
  type: ObjectType;
  rcsM2: number | null;
  apogeeKm: number;
  perigeeKm: number;
  inclinationDeg: number;
  /** Active conjunctions this object contributes to. */
  activeConjunctions: number;
  origin: string;
};
