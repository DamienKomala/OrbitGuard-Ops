"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Orbit } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/cn";

/**
 * Primary navigation.
 *
 * At xl and up it is the persistent 56px left rail the console is designed
 * around. Below that it becomes a fixed bottom bar — the same seven
 * destinations, moved into thumb reach, with labels since there is room for
 * them horizontally.
 *
 * Glass in both orientations, because it floats over the console and is never
 * read numerically.
 */
export function IconRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "glass-chrome fixed z-30 flex",
        // Bottom bar on small screens.
        "inset-x-0 bottom-0 h-14 flex-row items-stretch justify-around border-t border-line",
        // Left rail from xl.
        "xl:inset-y-0 xl:left-0 xl:right-auto xl:h-auto xl:w-rail xl:flex-col xl:items-center xl:justify-start xl:border-r xl:border-t-0"
      )}
    >
      <Link
        href="/"
        aria-label="OrbitGuard Ops console"
        className="hidden h-strip w-full items-center justify-center border-b border-line text-accent xl:flex"
      >
        <Orbit className="size-5" aria-hidden="true" />
      </Link>

      <ul className="flex flex-1 flex-row items-stretch justify-around xl:flex-none xl:flex-col xl:items-center xl:py-2">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative flex min-w-0 flex-1 xl:flex-none">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative flex w-full flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-150",
                  "xl:size-10 xl:gap-0",
                  active
                    ? "text-accent"
                    : "text-fg-dim hover:bg-white/[0.04] hover:text-fg"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="rail-active"
                    className={cn(
                      "absolute rounded-sm bg-accent",
                      // Underline on the bottom bar, leading edge on the rail.
                      "inset-x-3 top-0 h-[2px]",
                      "xl:inset-x-auto xl:inset-y-1 xl:left-[-8px] xl:top-auto xl:h-auto xl:w-[2px]"
                    )}
                    transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                  />
                ) : null}
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] leading-none xl:hidden">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
