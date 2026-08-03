import type { MarketSignal, SignalDirection } from "@/lib/market/signals";

const DIRECTION_STYLES: Record<SignalDirection, string> = {
  up: "bg-accent/10 text-accent border-accent/30",
  down: "bg-negative/10 text-negative border-negative/30",
  neutral: "bg-surface-2 text-muted border-edge",
};

const DIRECTION_GLYPHS: Record<SignalDirection, string> = {
  up: "▲",
  down: "▼",
  neutral: "•",
};

export function SignalFeed({ signals }: { signals: MarketSignal[] }) {
  if (signals.length === 0) {
    return (
      <p className="text-sm text-muted">
        No notable signals right now — a quiet tape. Signals appear here when
        indices, rates, volatility or held positions make meaningful moves.
      </p>
    );
  }

  return (
    <ul className="grid gap-2 lg:grid-cols-2">
      {signals.map((signal) => (
        <li
          key={signal.id}
          className="animate-rise-in flex items-start gap-3 rounded-xl border border-edge bg-surface-2 px-4 py-3"
        >
          <span
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${DIRECTION_STYLES[signal.direction]}`}
            aria-label={signal.direction}
          >
            {DIRECTION_GLYPHS[signal.direction]}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{signal.title}</p>
              <span className="rounded-full border border-edge px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                {signal.category}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {signal.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
