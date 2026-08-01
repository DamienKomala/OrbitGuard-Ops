import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Standard page frame for everything that is not the console itself.
 *
 * At xl the frame is pinned to the viewport and the body scrolls inside it, so
 * the heading stays put during long tables. Below xl the document scrolls
 * normally and the heading scrolls away with it.
 */
export function Page({
  title,
  subtitle,
  actions,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col p-2 xl:h-full">
      <div className="mb-2 flex shrink-0 flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-20 tracking-tight text-fg sm:text-28">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-13 text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className={cn("min-h-0 flex-1", scroll && "xl:overflow-y-auto")}>
        {children}
      </div>
    </div>
  );
}

/** Return path out of a detail page, back to its index. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-13 text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}

/**
 * Cross-reference to another record. Used wherever a detail page names an
 * entity that has its own page — a spacecraft, a catalog object, a screening
 * network — so no identifier in the product is a dead end.
 */
export function RefLink({
  href,
  children,
  mono,
}: {
  href: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-accent transition-colors hover:underline",
        mono && "font-mono"
      )}
    >
      {children}
      <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
    </Link>
  );
}
