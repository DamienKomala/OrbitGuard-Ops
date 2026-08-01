import Link from "next/link";
import { Radar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="max-w-[52ch] rounded-md border border-line bg-panel p-8">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-28 tracking-tight text-fg">No such record</h1>
        <p className="mt-3 text-13 text-fg-muted">
          That conjunction, spacecraft, burn, catalog object, or tracking network
          is not in the current scenario. Screening data is static in v0.1, so
          identifiers outside the loaded set have nothing behind them.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-13 font-medium text-bg transition-colors hover:bg-accent/85"
        >
          <Radar className="size-4" aria-hidden="true" />
          Back to console
        </Link>
      </div>
    </div>
  );
}
