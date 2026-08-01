/*
 * Standard astrodynamics models.
 *
 * Everything the detail pages report about orbits, perturbations, and burns is
 * computed here from published formulations rather than authored as a number.
 * References, all standard:
 *
 *   Vallado, "Fundamentals of Astrodynamics and Applications", 4th ed.
 *     — two-body geometry, vis-viva, J2 secular rates, Gauss's variational
 *       equations, Clohessy–Wiltshire relative motion.
 *   Clohessy & Wiltshire (1960) — linearised relative motion near a circular
 *     orbit; the source of the secular along-track drift a burn produces.
 *   Tsiolkovsky — propellant mass from delta-v, specific impulse, and vehicle
 *     mass.
 *   CCSDS 508.0-B-1 — Conjunction Data Message; the RIC/RTN frame and the
 *     covariance fields the screening pipeline consumes.
 *   Foster & Estes (1992), Chan (2008), Alfano (2005), Patera (2001)
 *     — probability-of-collision formulations offered in Settings.
 *
 * Units are explicit in every name: km, s, kg, N, deg, rad. Mixing them is the
 * classic way to lose a spacecraft.
 */

/** WGS-84 / EGM-96 gravitational parameter, km³/s². */
export const MU = 398600.4418;
/** WGS-84 equatorial radius, km. */
export const R_EARTH = 6378.137;
/** Second zonal harmonic — the dominant non-spherical term for LEO. */
export const J2 = 1.08262668e-3;
/** Standard gravity used to define specific impulse, m/s². */
export const G0 = 9.80665;
/** Mean solar day, s. Sun-synchronous nodal rate is 360°/tropical year. */
export const SOLAR_DAY_S = 86400;
/** Nodal regression a sun-synchronous orbit must hold, deg/day. */
export const SUN_SYNC_RATE_DEG_PER_DAY = 0.9856473;

const DEG = 180 / Math.PI;

/**
 * Quantise to a fixed number of decimals.
 *
 * Every exported value passes through this. Math.sqrt/log/exp/cos are only
 * implementation-precise, so Node and the browser can disagree in the last bits
 * — enough to produce a hydration mismatch once a value is rendered as text.
 * Quantising well below display precision removes the whole class of bug.
 */
const q = (v: number, decimals = 8): number => {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
};

export type OrbitGeometry = {
  /** Semi-major axis, km. */
  semiMajorAxisKm: number;
  eccentricity: number;
  /** Semi-latus rectum, km. */
  semiLatusRectumKm: number;
  periodMin: number;
  /** Mean motion, rev/day — the form a TLE carries. */
  meanMotionRevPerDay: number;
  /** Mean motion, rad/s — the form the variational equations want. */
  meanMotionRadPerS: number;
  velocityApogeeKmS: number;
  velocityPerigeeKmS: number;
  /** Circular-equivalent speed at semi-major axis, km/s. */
  meanVelocityKmS: number;
};

/**
 * Two-body geometry from apogee and perigee altitude — the pair a catalogue
 * carries. Vis-viva gives the speeds at each apsis.
 */
export function orbitFromAltitudes(
  apogeeKm: number,
  perigeeKm: number
): OrbitGeometry {
  const ra = R_EARTH + apogeeKm;
  const rp = R_EARTH + perigeeKm;
  const a = (ra + rp) / 2;
  const e = (ra - rp) / (ra + rp);
  const p = a * (1 - e * e);
  const n = Math.sqrt(MU / (a * a * a));

  return {
    semiMajorAxisKm: q(a, 3),
    eccentricity: q(e, 7),
    semiLatusRectumKm: q(p, 3),
    periodMin: q((2 * Math.PI) / n / 60, 4),
    meanMotionRevPerDay: q((n * SOLAR_DAY_S) / (2 * Math.PI), 6),
    meanMotionRadPerS: q(n, 12),
    velocityApogeeKmS: q(visViva(ra, a), 6),
    velocityPerigeeKmS: q(visViva(rp, a), 6),
    meanVelocityKmS: q(Math.sqrt(MU / a), 6),
  };
}

/** Vis-viva: v² = μ(2/r − 1/a). */
export function visViva(rKm: number, semiMajorAxisKm: number): number {
  return Math.sqrt(MU * (2 / rKm - 1 / semiMajorAxisKm));
}

export type J2Rates = {
  /** Nodal regression Ω̇, deg/day. Negative for prograde orbits. */
  nodalRegressionDegPerDay: number;
  /** Apsidal rotation ω̇, deg/day. Zero near the 63.4° critical inclination. */
  apsidalRotationDegPerDay: number;
  /** Within 0.02 deg/day of the sun-synchronous rate. */
  isSunSynchronous: boolean;
};

/**
 * Secular rates from the J2 oblateness term — the perturbation that dominates
 * everything else in LEO and sets whether an orbit is sun-synchronous.
 *
 *   Ω̇ = −3/2 · J2 · (R⊕/p)² · n · cos i
 *   ω̇ =  3/4 · J2 · (R⊕/p)² · n · (5cos²i − 1)
 */
export function j2Rates(orbit: OrbitGeometry, inclinationDeg: number): J2Rates {
  const i = inclinationDeg / DEG;
  const factor =
    J2 * (R_EARTH / orbit.semiLatusRectumKm) ** 2 * orbit.meanMotionRadPerS;
  const perDay = DEG * SOLAR_DAY_S;

  const nodal = -1.5 * factor * Math.cos(i) * perDay;
  const apsidal = 0.75 * factor * (5 * Math.cos(i) ** 2 - 1) * perDay;

  return {
    nodalRegressionDegPerDay: q(nodal, 5),
    apsidalRotationDegPerDay: q(apsidal, 5),
    isSunSynchronous: Math.abs(nodal - SUN_SYNC_RATE_DEG_PER_DAY) < 0.02,
  };
}

export type BurnResponse = {
  /** Change in semi-major axis, km. */
  deltaSemiMajorAxisKm: number;
  /** Change in eccentricity (dimensionless). */
  deltaEccentricity: number;
  /** Change in inclination, deg. */
  deltaInclinationDeg: number;
  /** Change in orbital period, s. */
  deltaPeriodS: number;
  /** Secular along-track displacement accumulated by a given lead time, km. */
  alongTrackDriftKm: number;
  /** Along-track drift rate, km per orbit. */
  driftPerOrbitKm: number;
};

/**
 * Orbit response to an impulsive burn, from Gauss's variational equations
 * evaluated on a near-circular orbit (e ≈ 0, so the true-anomaly terms drop):
 *
 *   in-track   Δa = 2·Δv_S / n        Δe = 2·Δv_S / v
 *   radial     Δa = 0                 Δe = Δv_R / v
 *   cross-track                       Δi = Δv_W / v   (at the node)
 *
 * The along-track drift is the Clohessy–Wiltshire secular term. It is the whole
 * mechanism of an in-track avoidance burn: the burn barely moves the spacecraft
 * at the time it fires, but the period change accumulates separation linearly,
 *
 *   Δx(t) = −3/2 · n · Δa · t = −3 · Δv_S · t
 *
 * so lead time, not delta-v, is what buys miss distance.
 */
export function burnResponse(
  orbit: OrbitGeometry,
  axis: "radial" | "in-track" | "cross-track",
  deltaVMs: number,
  leadTimeS: number
): BurnResponse {
  const dv = deltaVMs / 1000; // km/s
  const n = orbit.meanMotionRadPerS;
  const v = orbit.meanVelocityKmS;

  const inTrack = axis === "in-track";
  const da = inTrack ? (2 * dv) / n : 0;
  const de =
    axis === "in-track" ? (2 * dv) / v : axis === "radial" ? dv / v : 0;
  const di = axis === "cross-track" ? DEG * (dv / v) : 0;

  // ΔP/P = 3/2 · Δa/a
  const periodS = (2 * Math.PI) / n;
  const dP = 1.5 * periodS * (da / orbit.semiMajorAxisKm);

  const drift = -1.5 * n * da * leadTimeS;
  const driftPerOrbit = -1.5 * n * da * periodS;

  return {
    deltaSemiMajorAxisKm: q(da, 6),
    deltaEccentricity: q(de, 9),
    deltaInclinationDeg: q(di, 7),
    deltaPeriodS: q(dP, 5),
    alongTrackDriftKm: q(Math.abs(drift), 4),
    driftPerOrbitKm: q(Math.abs(driftPerOrbit), 5),
  };
}

/**
 * Propellant consumed by an impulsive burn — Tsiolkovsky solved for mass:
 *
 *   m_p = m₀ · (1 − e^(−Δv / (Isp·g₀)))
 */
export function propellantForBurnKg(
  massKg: number,
  deltaVMs: number,
  ispS: number
): number {
  return q(massKg * (1 - Math.exp(-deltaVMs / (ispS * G0))), 6);
}

/**
 * Delta-v still available from a usable propellant mass — Tsiolkovsky forward:
 *
 *   Δv = Isp·g₀·ln(m₀ / (m₀ − m_p))
 */
export function deltaVAvailableMs(
  massKg: number,
  usablePropellantKg: number,
  ispS: number
): number {
  if (usablePropellantKg <= 0 || usablePropellantKg >= massKg) return 0;
  return q(ispS * G0 * Math.log(massKg / (massKg - usablePropellantKg)), 4);
}

/** Finite-burn duration for a constant-thrust system: t = m·Δv / F. */
export function burnDurationS(
  massKg: number,
  deltaVMs: number,
  thrustN: number
): number {
  return q((massKg * deltaVMs) / thrustN, 3);
}

/**
 * Ballistic coefficient, kg/m². The inverse of area-to-mass ratio and the
 * parameter drag uncertainty enters through — a low value means the object is
 * pushed around by the atmosphere, which is why small debris carries the widest
 * covariance and the widest Pc band.
 */
export function ballisticCoefficient(
  massKg: number,
  areaM2: number,
  dragCoefficient = 2.2
): number {
  return q(massKg / (dragCoefficient * areaM2), 3);
}

/**
 * Mass inferred from radar cross-section, assuming a spherical aluminium
 * fragment. Crude by construction — a real catalogue carries measured mass for
 * payloads and nothing at all for most debris — but it is the standard way to
 * get an area-to-mass ratio when only RCS is on file.
 */
export function massFromRcsKg(rcsM2: number, densityKgM3 = 2700): number {
  const radiusM = Math.sqrt(rcsM2 / Math.PI);
  return q((4 / 3) * Math.PI * radiusM ** 3 * densityKgM3, 4);
}

/**
 * Combined hard-body radius, m. Standard practice is the sum of the two
 * objects' circumscribing radii; the screening volume is a sphere of that
 * radius swept along the relative velocity.
 */
export function hardBodyRadiusM(
  primaryRadiusM: number,
  secondaryRcsM2: number | null
): number {
  // 0.5 m is the conventional stand-in when a secondary is uncharacterised.
  const secondary =
    secondaryRcsM2 === null ? 0.5 : Math.sqrt(secondaryRcsM2 / Math.PI);
  return q(primaryRadiusM + secondary, 3);
}

/** Orbit class by perigee/apogee, using the conventional altitude bands. */
export function orbitRegime(apogeeKm: number, perigeeKm: number): string {
  if (apogeeKm < 2000) return "LEO";
  if (perigeeKm > 35000 && apogeeKm < 36500) return "GEO";
  if (perigeeKm < 2000 && apogeeKm > 35000) return "GTO";
  if (apogeeKm < 35786) return "MEO";
  return "HEO";
}

/**
 * Encounter classified by relative speed. The regime decides which Pc
 * formulation is valid: the standard 2-D analytic methods assume a
 * rectilinear, short-duration encounter, which fails once relative motion is
 * slow enough that the objects stay correlated across the approach.
 */
export function encounterRegime(relVelocityKmS: number): {
  label: string;
  note: string;
} {
  if (relVelocityKmS >= 1) {
    return {
      label: "hypervelocity",
      note: "Rectilinear-relative-motion assumption holds; 2-D analytic Pc is valid.",
    };
  }
  if (relVelocityKmS >= 0.1) {
    return {
      label: "moderate",
      note: "Encounter duration is long enough that the 2-D projection begins to lose accuracy.",
    };
  }
  return {
    label: "low-velocity",
    note: "Non-linear relative motion. 2-D analytic Pc is invalid — use a Monte Carlo or Alfano–Coppola formulation.",
  };
}

/**
 * Fraction of an along-track displacement that shows up as miss distance.
 *
 * A burn displaces the primary along its own velocity vector, but only the
 * component perpendicular to the *relative* velocity lies in the encounter
 * B-plane and changes how close the objects pass. The rest changes when they
 * arrive, not how near. For a near-head-on conjunction the along-track
 * direction is almost parallel to the relative velocity, so a large
 * displacement buys surprisingly little separation.
 */
export function bPlaneProjection(
  alongTrackKm: number,
  missBeforeKm: number,
  missAfterKm: number
): { factor: number; angleDeg: number } {
  if (alongTrackKm <= 0) return { factor: 0, angleDeg: 0 };
  const gained = Math.max(0, missAfterKm - missBeforeKm);
  const factor = Math.min(1, gained / alongTrackKm);
  return {
    factor: q(factor, 5),
    angleDeg: q(DEG * Math.asin(Math.min(1, factor)), 3),
  };
}
