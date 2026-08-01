"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measured size of an element, for charts that draw in real pixels.
 *
 * The charts set their viewBox to the measured width so one SVG unit is always
 * one CSS pixel. That keeps 11px axis labels at 11px on a phone instead of
 * scaling the whole drawing down to illegibility — a narrow screen buys less
 * time resolution, not smaller type. Height is used to distribute lanes across
 * the panel rather than leaving dead space under a content-sized chart.
 *
 * The fallbacks are used for the server render and the first client render, so
 * hydration matches; the observer corrects them immediately after mount.
 *
 * Safe against feedback loops only because the observed element takes its size
 * from its flex parent, not from this chart's content.
 */
export function useElementSize<T extends HTMLElement>(
  fallbackWidth: number,
  fallbackHeight: number
) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({
    width: fallbackWidth,
    height: fallbackHeight,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setSize((prev) => {
        const width = Math.round(box.width);
        const height = Math.round(box.height);
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
