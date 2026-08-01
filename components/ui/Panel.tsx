import { cn } from "@/lib/cn";

/**
 * A data surface. Flat fill, 1px border, no blur and no shadow — anything a
 * reader has to measure sits on one of these, never on glass.
 */
export function Panel({
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-md border border-line bg-panel",
        className
      )}
    >
      {title ? (
        <header className="flex h-8 shrink-0 items-center justify-between border-b border-line px-3">
          <h2 className="eyebrow">{title}</h2>
          {meta ? <div className="text-11 text-fg-dim">{meta}</div> : null}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Label-over-value pair. The unit is dimmed so the numeral reads first. */
export function Field({
  label,
  value,
  unit,
  tone,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: string;
  size?: "sm" | "md" | "lg";
}) {
  const valueSize =
    size === "lg" ? "text-28" : size === "sm" ? "text-13" : "text-20";
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span className={cn("font-mono leading-none", valueSize, tone ?? "text-fg")}>
        {value}
        {unit ? (
          <span className="ml-1 text-11 text-fg-dim">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}
