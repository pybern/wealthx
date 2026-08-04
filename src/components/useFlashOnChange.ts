"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks a list of items across re-renders (e.g. the 60s AutoRefresh
 * cycle) and returns the ids whose fingerprint is new or changed, so the
 * UI can flash them. Nothing flashes on first mount; the set clears
 * itself after `durationMs`.
 */
export function useFlashOnChange(
  items: { id: string; fingerprint: string }[],
  durationMs = 1800,
): Set<string> {
  const prevRef = useRef<Map<string, string> | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const key = items.map((i) => `${i.id}|${i.fingerprint}`).join("\n");

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = new Map(items.map((i) => [i.id, i.fingerprint]));
    if (!prev) return;
    const changed = new Set(
      items
        .filter((i) => prev.get(i.id) !== i.fingerprint)
        .map((i) => i.id),
    );
    if (changed.size === 0) return;
    setFlashIds(changed);
    const timer = setTimeout(() => setFlashIds(new Set()), durationMs);
    return () => clearTimeout(timer);
    // `key` encodes the full item list; `items` itself is a fresh array
    // every render and would retrigger the effect endlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, durationMs]);

  return flashIds;
}
