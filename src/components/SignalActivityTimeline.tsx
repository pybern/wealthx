"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketSignal } from "@/lib/market/signals";

interface TimelineEvent {
  id: string;
  title: string;
  category: string;
  direction: MarketSignal["direction"];
  at: string;
}

function fingerprint(signal: MarketSignal): string {
  return `${signal.title}|${signal.detail}`;
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SignalActivityTimeline({
  signals,
}: {
  signals: MarketSignal[];
}) {
  const previousRef = useRef<Map<string, string> | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(() =>
    signals.slice(0, 5).map((signal) => ({
      id: `initial-${signal.id}`,
      title: signal.title,
      category: signal.category,
      direction: signal.direction,
      at: "current",
    })),
  );
  const key = signals.map((signal) => `${signal.id}|${fingerprint(signal)}`).join("\n");

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = new Map(
      signals.map((signal) => [signal.id, fingerprint(signal)]),
    );
    if (!previous) return;

    const changed = signals.filter(
      (signal) => previous.get(signal.id) !== fingerprint(signal),
    );
    if (changed.length === 0) return;
    const at = nowLabel();
    setEvents((current) =>
      [
        ...changed.map((signal, index) => ({
          id: `${signal.id}-${Date.now()}-${index}`,
          title: signal.title,
          category: signal.category,
          direction: signal.direction,
          at,
        })),
        ...current,
      ].slice(0, 8),
    );
    // `key` is the stable serialization of the incoming signal snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <aside className="rounded-xl border border-edge bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Signal activity
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
          <span className="live-status-dot h-1.5 w-1.5 rounded-full bg-accent" />
          watching
        </span>
      </div>
      <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-edge">
        {events.map((event) => (
          <li key={event.id} className="animate-rise-in relative pl-4">
            <span
              className={`absolute left-0 top-1.5 h-[7px] w-[7px] rounded-full ring-2 ring-surface-2 ${
                event.direction === "up"
                  ? "bg-accent"
                  : event.direction === "down"
                    ? "bg-negative"
                    : "bg-muted"
              }`}
            />
            <p className="text-xs font-medium leading-snug">{event.title}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {event.at} · {event.category}
            </p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
