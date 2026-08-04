"use client";

import type { NewsItem } from "@/lib/market/news";
import { useFlashOnChange } from "./useFlashOnChange";

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(Math.floor(deltaMs / 60_000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function NewsFeed({
  items,
  heldSymbols,
}: {
  items: NewsItem[];
  heldSymbols: string[];
}) {
  const flashIds = useFlashOnChange(
    items.map((n) => ({ id: n.id, fingerprint: n.id })),
  );
  const held = new Set(heldSymbols);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        No fresh headlines right now. The feed refreshes automatically as new
        stories are published.
      </p>
    );
  }

  return (
    <ul className="grid gap-2 lg:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`animate-rise-in rounded-xl border border-edge bg-surface-2 px-4 py-3 ${
            flashIds.has(item.id) ? "signal-flash" : ""
          }`}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium leading-snug transition-colors hover:text-accent"
          >
            {item.title}
          </a>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{item.publisher}</span>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>
              {relativeTime(item.publishedAt)}
            </span>
            {item.relatedTickers.map((ticker) => (
              <span
                key={ticker}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  held.has(ticker)
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-edge text-muted"
                }`}
                title={held.has(ticker) ? "Held in your book" : undefined}
              >
                {ticker}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
