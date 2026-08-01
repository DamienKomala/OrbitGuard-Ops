"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/data";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

/**
 * Screening configuration.
 *
 * The choices offered here are the standard ones a conjunction-assessment
 * pipeline actually exposes — Pc formulation, propagation theory and force
 * model, screening volume, hard-body radius policy, and command lead time.
 * Defaults follow common practice: a 1×10⁻⁴ action threshold and 1×10⁻⁵
 * screening floor, an ellipsoidal screening volume elongated along-track, and
 * a combined hard-body radius.
 *
 * Controls hold local state only in v0.1 — nothing here writes back to the
 * screening data.
 */

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-13 text-fg">{label}</p>
        <p className="max-w-[68ch] text-11 text-fg-dim">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-line p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-sm px-2.5 py-1 font-mono text-11 transition-colors duration-150",
            value === o ? "bg-accent/15 text-accent" : "text-fg-dim hover:text-fg"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  // Screening thresholds
  const [action, setAction] = useState("1×10⁻⁴");
  const [floor, setFloor] = useState("1×10⁻⁵");
  const [missFloor, setMissFloor] = useState("5 km");

  // Pc formulation
  const [pcMethod, setPcMethod] = useState("Foster 2-D");
  const [hbr, setHbr] = useState("combined");
  const [covScale, setCovScale] = useState("1.0");
  const [dilution, setDilution] = useState("flag");

  // Propagation
  const [propagator, setPropagator] = useState("SP");
  const [gravity, setGravity] = useState("8×8");
  const [atmosphere, setAtmosphere] = useState("NRLMSISE-00");
  const [srp, setSrp] = useState("on");
  const [thirdBody, setThirdBody] = useState("Sun + Moon");

  // Screening volume, RIC half-widths
  const [volRadial, setVolRadial] = useState("1 km");
  const [volInTrack, setVolInTrack] = useState("25 km");
  const [volCrossTrack, setVolCrossTrack] = useState("25 km");

  // Maneuver policy
  const [lead, setLead] = useState("8 h");
  const [burnModel, setBurnModel] = useState("impulsive");
  const [preferredAxis, setPreferredAxis] = useState("in-track");

  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(
      SOURCES.map((s) => [s.id, s.kind === "onboard" ? "high" : "normal"])
    )
  );

  return (
    <Page
      title="Settings"
      subtitle="Screening thresholds, Pc formulation, propagation, and maneuver policy"
    >
      <div className="grid max-w-[1100px] grid-cols-1 gap-2 pb-2">
        <Panel title="Screening thresholds">
          <Row
            label="Pc action threshold"
            hint="Above this, an event is critical and a maneuver solution is generated. 1×10⁻⁴ is the common operational value."
          >
            <Choice
              options={["1×10⁻³", "1×10⁻⁴", "1×10⁻⁵"]}
              value={action}
              onChange={setAction}
            />
          </Row>
          <Row
            label="Pc screening floor"
            hint="Below this, events are logged but stay off the console."
          >
            <Choice
              options={["1×10⁻⁵", "1×10⁻⁶", "1×10⁻⁷"]}
              value={floor}
              onChange={setFloor}
            />
          </Row>
          <Row
            label="Miss distance floor"
            hint="Screen every approach closer than this regardless of Pc, so a near miss with an implausibly small covariance still surfaces."
          >
            <Choice
              options={["2 km", "5 km", "10 km"]}
              value={missFloor}
              onChange={setMissFloor}
            />
          </Row>
        </Panel>

        <Panel title="Probability of collision">
          <Row
            label="Pc formulation"
            hint="Foster and Chan are 2-D analytic methods valid for short, rectilinear hypervelocity encounters. Alfano handles longer encounters; Monte Carlo is the fallback when relative motion is non-linear."
          >
            <Choice
              options={["Foster 2-D", "Chan analytic", "Alfano 2005", "Monte Carlo"]}
              value={pcMethod}
              onChange={setPcMethod}
            />
          </Row>
          <Row
            label="Hard-body radius"
            hint="Combined uses the sum of both circumscribing radii, inferred from RCS where no dimensions are on file. A fixed value is the conservative fallback for uncharacterized secondaries."
          >
            <Choice
              options={["combined", "fixed 20 m", "fixed 50 m"]}
              value={hbr}
              onChange={setHbr}
            />
          </Row>
          <Row
            label="Covariance scale factor"
            hint="Multiplier applied to the delivered covariance. Values above 1.0 inflate an optimistic covariance; a scaled covariance changes Pc non-monotonically."
          >
            <Choice
              options={["0.5", "1.0", "2.0", "3.0"]}
              value={covScale}
              onChange={setCovScale}
            />
          </Row>
          <Row
            label="Dilution handling"
            hint="Pc rises then falls as covariance shrinks, so a small Pc from a large covariance is not the same as a small Pc from a tight one. Flagging surfaces events sitting in the dilution region; max-Pc reports the peak the event could still reach."
          >
            <Choice
              options={["flag", "report max Pc", "ignore"]}
              value={dilution}
              onChange={setDilution}
            />
          </Row>
        </Panel>

        <Panel title="Propagation">
          <Row
            label="Propagator"
            hint="SP integrates numerically against the force model below and carries a real covariance. SGP4 is the analytic mean-element theory a TLE encodes — faster, but with no formal covariance of its own."
          >
            <Choice
              options={["SP", "SGP4/SDP4"]}
              value={propagator}
              onChange={setPropagator}
            />
          </Row>
          <Row
            label="Geopotential degree and order"
            hint="J2 alone captures nodal regression and apsidal rotation. Higher orders matter for resonance and for repeat-ground-track orbits."
          >
            <Choice
              options={["J2 only", "4×4", "8×8", "20×20"]}
              value={gravity}
              onChange={setGravity}
            />
          </Row>
          <Row
            label="Atmosphere model"
            hint="Drag is the dominant error source below ~700 km and the reason along-track covariance grows fastest. JB2008 responds better to solar activity; Harris-Priester is the cheap static option."
          >
            <Choice
              options={["NRLMSISE-00", "JB2008", "Harris-Priester"]}
              value={atmosphere}
              onChange={setAtmosphere}
            />
          </Row>
          <Row
            label="Solar radiation pressure"
            hint="Matters most for high area-to-mass objects — deployed panels, insulation fragments, and anything uncharacterized."
          >
            <Choice options={["on", "off"]} value={srp} onChange={setSrp} />
          </Row>
          <Row
            label="Third-body perturbations"
            hint="Lunisolar terms are small in LEO over a 72-hour screening window but grow with altitude."
          >
            <Choice
              options={["none", "Sun + Moon"]}
              value={thirdBody}
              onChange={setThirdBody}
            />
          </Row>
        </Panel>

        <Panel title="Screening volume">
          <Row
            label="Radial half-width"
            hint="The RIC box each propagated state is screened against. Radial is kept tight because radial position is the best-determined axis."
          >
            <Choice
              options={["0.5 km", "1 km", "2 km"]}
              value={volRadial}
              onChange={setVolRadial}
            />
          </Row>
          <Row
            label="In-track half-width"
            hint="Widest axis by design — along-track is where drag and timing error accumulate, so the volume is elongated along the velocity vector."
          >
            <Choice
              options={["10 km", "25 km", "50 km"]}
              value={volInTrack}
              onChange={setVolInTrack}
            />
          </Row>
          <Row
            label="Cross-track half-width"
            hint="Set by plane-determination accuracy; usually matched to the in-track width for simplicity."
          >
            <Choice
              options={["10 km", "25 km", "50 km"]}
              value={volCrossTrack}
              onChange={setVolCrossTrack}
            />
          </Row>
        </Panel>

        <Panel title="Maneuver policy">
          <Row
            label="Command lead time"
            hint="Upload, propagation, and ground-station contact margin subtracted from TCA to set the decision deadline on every event."
          >
            <Choice
              options={["4 h", "6 h", "8 h", "12 h"]}
              value={lead}
              onChange={setLead}
            />
          </Row>
          <Row
            label="Burn model"
            hint="Impulsive is valid when the burn is short against the orbital period. Electric propulsion needs a finite-burn model — thrust spans a meaningful arc, so the achieved delta-v is direction-averaged."
          >
            <Choice
              options={["impulsive", "finite"]}
              value={burnModel}
              onChange={setBurnModel}
            />
          </Row>
          <Row
            label="Preferred burn axis"
            hint="In-track is the cheapest way to buy miss distance: a period change accumulates along-track separation as 3·Δv·t, so lead time does the work. Radial and cross-track act immediately but cost far more delta-v for the same separation."
          >
            <Choice
              options={["in-track", "radial", "cross-track"]}
              value={preferredAxis}
              onChange={setPreferredAxis}
            />
          </Row>
        </Panel>

        <Panel title="Source trust">
          {SOURCES.map((s) => (
            <Row
              key={s.id}
              label={s.name}
              hint={`${s.kind} · ${s.observationTypes.join(", ")} · 1σ ${s.positionSigmaM} m`}
            >
              <Choice
                options={["low", "normal", "high"]}
                value={weights[s.id]}
                onChange={(v) => setWeights((w) => ({ ...w, [s.id]: v }))}
              />
            </Row>
          ))}
        </Panel>

        <p className="px-2 text-11 text-fg-dim">
          v0.1 prototype — these controls hold local state only and do not write
          back to the screening data.
        </p>
      </div>
    </Page>
  );
}
