"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MissionClockProvider } from "@/lib/mission-clock";
import { IconRail } from "./IconRail";
import { StatusStrip } from "./StatusStrip";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MissionClockProvider>
      <IconRail />
      <StatusStrip onOpenPalette={() => setPaletteOpen(true)} />

      {/* Offsets: top strip always, bottom bar below xl, left rail from xl.
          Below xl the document scrolls; at xl the shell is pinned to the
          viewport and each panel scrolls inside itself. */}
      <div className="pb-14 pl-0 pt-strip xl:pb-0 xl:pl-rail">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -2 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="min-h-[calc(100dvh-theme(spacing.strip)-3.5rem)] xl:h-[calc(100dvh-theme(spacing.strip))] xl:min-h-0"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </MissionClockProvider>
  );
}
