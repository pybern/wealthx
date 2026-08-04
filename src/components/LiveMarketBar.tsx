"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFlashOnChange } from "./useFlashOnChange";

interface LiveQuote {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
  source: "live" | "fallback";
}

interface MarketResponse {
  asOf: string;
  quotes: LiveQuote[];
}

const REFRESH_SECONDS = 60;

function isUsMarketOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const weekday = value("weekday");
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  const minutes = hour * 60 + minute;
  return (
    weekday !== "Sat" &&
    weekday !== "Sun" &&
    minutes >= 9 * 60 + 30 &&
    minutes < 16 * 60
  );
}

function formatPrice(quote: LiveQuote): string {
  if (quote.symbol === "^TNX") return `${quote.price.toFixed(3)}%`;
  if (quote.symbol === "^VIX") return quote.price.toFixed(2);
  return quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function LiveMarketBar() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [secondsToRefresh, setSecondsToRefresh] = useState(REFRESH_SECONDS);
  const [clock, setClock] = useState(() => new Date());
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/live/market", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as MarketResponse);
      setError(false);
      setSecondsToRefresh(REFRESH_SECONDS);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), REFRESH_SECONDS * 1000);
    const tick = window.setInterval(() => {
      setClock(new Date());
      setSecondsToRefresh((seconds) =>
        seconds <= 1 ? REFRESH_SECONDS : seconds - 1,
      );
    }, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [load]);

  const flashIds = useFlashOnChange(
    (data?.quotes ?? []).map((quote) => ({
      id: quote.symbol,
      fingerprint: `${quote.price}|${quote.changePct}|${quote.source}`,
    })),
  );
  const marketOpen = isUsMarketOpen(clock);
  const allLive =
    data !== null && data.quotes.every((quote) => quote.source === "live");
  const ageSeconds = data
    ? Math.max(0, Math.floor((clock.getTime() - new Date(data.asOf).getTime()) / 1000))
    : null;
  const statusLabel = error
    ? "Data connection interrupted"
    : !data
      ? "Connecting to live markets"
      : allLive
        ? "Live data connected"
        : "Some sources on fallback";

  const tickerItems = useMemo(() => data?.quotes ?? [], [data]);

  return (
    <div className="sticky top-0 z-30 border-b border-edge bg-background/95 backdrop-blur">
      <div className="flex h-9 items-center gap-4 border-b border-edge/70 px-6 text-[11px]">
        <span
          className={`inline-flex items-center gap-2 font-medium ${
            error ? "text-negative" : allLive ? "text-accent" : "text-gold"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              error
                ? "bg-negative"
                : allLive
                  ? "live-status-dot bg-accent"
                  : "bg-gold"
            }`}
          />
          {statusLabel}
        </span>
        <span className="hidden text-muted sm:inline">
          US market {marketOpen ? "open" : "closed"}
        </span>
        <span className="ml-auto tabular-nums text-muted">
          {ageSeconds === null
            ? "Waiting for first update"
            : `Updated ${ageSeconds}s ago · next in ${secondsToRefresh}s`}
        </span>
      </div>

      <div className="ticker-viewport h-8 overflow-hidden px-6">
        {tickerItems.length === 0 ? (
          <div className="flex h-full items-center text-xs text-muted">
            Loading live indices, rates and commodities…
          </div>
        ) : (
          <div className="ticker-track flex h-full w-max items-center gap-8">
            {[...tickerItems, ...tickerItems].map((quote, index) => (
              <div
                key={`${quote.symbol}-${index}`}
                className={`flex items-center gap-2 whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${
                  flashIds.has(quote.symbol) ? "quote-flash" : ""
                } ${quote.source === "fallback" ? "opacity-55" : ""}`}
              >
                <span className="font-medium">{quote.label}</span>
                <span className="font-mono tabular-nums">
                  {formatPrice(quote)}
                </span>
                <span
                  className={
                    quote.changePct > 0
                      ? "text-accent"
                      : quote.changePct < 0
                        ? "text-negative"
                        : "text-muted"
                  }
                >
                  {quote.changePct >= 0 ? "+" : ""}
                  {quote.changePct.toFixed(2)}%
                </span>
                {quote.source === "fallback" && (
                  <span className="text-[9px] uppercase tracking-wider text-gold">
                    fallback
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
