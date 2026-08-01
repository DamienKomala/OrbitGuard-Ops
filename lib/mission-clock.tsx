"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SCENARIO_EPOCH_MS } from "@/lib/data";

/*
 * The mission clock starts at SCENARIO_EPOCH and advances in real time.
 *
 * This is what lets the data stay completely static while countdowns, the UTC
 * readout, and the NOW rule all tick. The server renders at exactly
 * SCENARIO_EPOCH_MS and so does the client's first render, so hydration matches
 * to the millisecond; the interval only starts afterward.
 */
const MissionClockContext = createContext<number>(SCENARIO_EPOCH_MS);

export function MissionClockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nowMs, setNowMs] = useState(SCENARIO_EPOCH_MS);

  useEffect(() => {
    const wallStart = Date.now();
    const id = window.setInterval(() => {
      setNowMs(SCENARIO_EPOCH_MS + (Date.now() - wallStart));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <MissionClockContext.Provider value={nowMs}>
      {children}
    </MissionClockContext.Provider>
  );
}

export function useMissionClock(): number {
  return useContext(MissionClockContext);
}
