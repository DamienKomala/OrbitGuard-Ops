import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Every numeral in the product renders in this face, at tabular widths.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OrbitGuard Ops — Collision Avoidance Console",
    template: "%s — OrbitGuard Ops",
  },
  description:
    "Conjunction screening, probability-of-collision trending, and maneuver planning for small satellite fleets.",
};

export const viewport: Viewport = {
  themeColor: "#0B0F14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      {/* The document scrolls below xl; at xl the shell pins to the viewport
          and each panel scrolls inside itself. */}
      <body className="bg-bg xl:overflow-hidden">
        <AppShell>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
