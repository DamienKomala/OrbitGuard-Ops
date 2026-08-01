"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { NAV } from "@/lib/nav";
import { CATALOG, CONJUNCTIONS, FLEET, MANEUVER_LOG, SOURCES } from "@/lib/data";
import { cn } from "@/lib/cn";

type Entry = {
  id: string;
  label: string;
  hint: string;
  group: string;
  href: string;
};

const MAX_RESULTS = 9;

/** Pure so it can be re-run inside an event handler, not just during render. */
function filterEntries(entries: Entry[], query: string): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, MAX_RESULTS);
  return entries
    .filter(
      (e) =>
        e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q)
    )
    .slice(0, MAX_RESULTS);
}

/**
 * ⌘K palette. The one place in the product with a true overlay material:
 * heavier blur, thinner tint, and a hairline ring instead of a shadow. The
 * scrim blurs the console rather than dimming it, so an operator keeps
 * peripheral awareness of lane positions while typing.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // AppShell hands a fresh closure every tick of the mission clock; holding it
  // in a ref keeps the listener registration out of that churn.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const entries = useMemo<Entry[]>(
    () => [
      ...NAV.map((n) => ({
        id: `nav:${n.href}`,
        label: n.label,
        hint: n.hint,
        group: "Navigate",
        href: n.href,
      })),
      ...CONJUNCTIONS.map((c) => ({
        id: `cj:${c.id}`,
        label: `${c.id} · ${c.secondaryName}`,
        hint: `${c.primaryId} · NORAD ${c.secondaryNorad}`,
        group: "Conjunctions",
        href: `/conjunctions/${c.id}`,
      })),
      ...FLEET.map((s) => ({
        id: `sc:${s.id}`,
        label: `${s.id} · ${s.name}`,
        hint: `${s.bus} · ${s.altitudeKm} km`,
        group: "Fleet",
        href: `/fleet/${s.id}`,
      })),
      ...MANEUVER_LOG.map((m) => ({
        id: `mnv:${m.id}`,
        label: `${m.id} · ${m.secondaryName}`,
        hint: `${m.spacecraftId} · ${m.deltaVMs.toFixed(2)} m/s · ${m.status}`,
        group: "Maneuvers",
        href: `/maneuvers/${m.id}`,
      })),
      ...CATALOG.map((o) => ({
        id: `obj:${o.norad}`,
        label: `${o.norad} · ${o.name}`,
        hint: `${o.type.replace("-", " ")} · ${o.origin}`,
        group: "Catalog",
        href: `/catalog/${o.norad}`,
      })),
      ...SOURCES.map((s) => ({
        id: `src:${s.id}`,
        label: s.name,
        hint: `${s.kind} · ${s.coverage}`,
        group: "Sources",
        href: `/sources/${s.id}`,
      })),
    ],
    []
  );

  const results = useMemo(
    () => filterEntries(entries, query),
    [entries, query]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // Focus after the enter transition so the caret does not appear mid-scale.
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  /*
   * Enter must act on what the operator is looking at, never on a stale list.
   *
   * Two separate lags can put those out of step. The listener is registered in
   * an effect, which React runs after paint, so a handler closing over render
   * values would hold the previous keystroke's results — refs fix that. And on
   * a fast keystroke React may not have re-rendered at all yet, so even the
   * refs lag by one input event; WebKit dispatches quickly enough to hit this.
   *
   * So the handler recomputes from the input's live DOM value. When that value
   * has outrun committed state the visible list is about to change, and the
   * cursor resets to the top match for what is actually typed — which is what
   * the operator would have seen a frame later.
   */
  const entriesRef = useRef(entries);
  const resultsRef = useRef(results);
  const cursorRef = useRef(cursor);
  const queryRef = useRef(query);
  entriesRef.current = entries;
  resultsRef.current = results;
  cursorRef.current = cursor;
  queryRef.current = query;

  function activeTarget(): Entry | undefined {
    const live = inputRef.current?.value ?? queryRef.current;
    if (live === queryRef.current) return resultsRef.current[cursorRef.current];
    return filterEntries(entriesRef.current, live)[0];
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, resultsRef.current.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = activeTarget();
        if (target) {
          router.push(target.href);
          onCloseRef.current();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="glass-scrim fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
            className="glass-overlay mx-4 w-full max-w-[560px] overflow-hidden rounded-md"
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
              <Search className="size-4 shrink-0 text-fg-dim" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                placeholder="Search conjunctions, spacecraft, pages…"
                aria-label="Search"
                className="h-11 w-full bg-transparent text-15 text-fg outline-none placeholder:text-fg-dim"
              />
            </div>

            <ul className="max-h-[336px] overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-3 py-4 text-13 text-fg-dim">No matches.</li>
              ) : (
                results.map((entry, i) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => {
                        router.push(entry.href);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors duration-100",
                        i === cursor ? "bg-accent/15" : "hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-13 text-fg">
                          {entry.label}
                        </span>
                        <span className="truncate text-11 text-fg-dim">
                          {entry.hint}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="eyebrow">{entry.group}</span>
                        {i === cursor ? (
                          <CornerDownLeft
                            className="size-3 text-accent"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
