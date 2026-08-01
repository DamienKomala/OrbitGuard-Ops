import {
  Antenna,
  Crosshair,
  Database,
  Navigation,
  Radar,
  Satellite,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the command palette to disambiguate similar destinations. */
  hint: string;
};

/** Single source of truth for the rail, the palette, and page titles. */
export const NAV: NavItem[] = [
  { href: "/", label: "Console", icon: Radar, hint: "Live collision-avoidance picture" },
  {
    href: "/conjunctions",
    label: "Conjunctions",
    icon: Crosshair,
    hint: "Full screening queue",
  },
  { href: "/fleet", label: "Fleet", icon: Satellite, hint: "Spacecraft state and propellant" },
  {
    href: "/maneuvers",
    label: "Maneuvers",
    icon: Navigation,
    hint: "Burn log and open decisions",
  },
  { href: "/catalog", label: "Catalog", icon: Database, hint: "Tracked object catalog" },
  { href: "/sources", label: "Sources", icon: Antenna, hint: "Tracking network health" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "Thresholds and lead times" },
];

export function navTitle(pathname: string): string {
  if (pathname.startsWith("/conjunctions/")) return "Conjunction detail";
  if (pathname.startsWith("/fleet/")) return "Spacecraft detail";
  if (pathname.startsWith("/maneuvers/")) return "Maneuver detail";
  if (pathname.startsWith("/catalog/")) return "Object detail";
  if (pathname.startsWith("/sources/")) return "Source detail";
  return NAV.find((n) => n.href === pathname)?.label ?? "Console";
}
