import { cn } from "@/lib/cn";
import { pcParts, SEVERITY_BG } from "@/lib/format";
import type { Severity } from "@/lib/data";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Trend } from "@/lib/format";

/** Probability in scientific notation: mantissa × 10 to a real superscript. */
export function Pc({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  if (value <= 0) {
    return <span className={cn("font-mono text-fg-dim", className)}>—</span>;
  }
  const { mantissa, exponent } = pcParts(value);
  return (
    <span className={cn("font-mono whitespace-nowrap", className)}>
      {mantissa}
      <span className="text-fg-dim">×10</span>
      <sup className="text-[0.7em]">−{Math.abs(exponent)}</sup>
    </span>
  );
}

export function StatusDot({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-[6px] rounded-full", SEVERITY_BG[severity], className)}
    />
  );
}

export function TrendMark({ trend }: { trend: Trend }) {
  if (trend === "rising") {
    return (
      <span className="inline-flex items-center gap-1 text-critical">
        <ArrowUpRight className="size-3" aria-hidden="true" />
        <span className="text-11">rising</span>
      </span>
    );
  }
  if (trend === "falling") {
    return (
      <span className="inline-flex items-center gap-1 text-nominal">
        <ArrowDownRight className="size-3" aria-hidden="true" />
        <span className="text-11">falling</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-fg-dim">
      <Minus className="size-3" aria-hidden="true" />
      <span className="text-11">flat</span>
    </span>
  );
}
