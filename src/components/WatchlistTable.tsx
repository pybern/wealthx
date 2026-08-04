"use client";

import { Sparkline } from "./Sparkline";
import { useFlashOnChange } from "./useFlashOnChange";

interface WatchlistQuote {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  source: "live" | "fallback";
  sparkline: number[];
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function WatchlistTable({ quotes }: { quotes: WatchlistQuote[] }) {
  const flashIds = useFlashOnChange(
    quotes.map((quote) => ({
      id: quote.symbol,
      fingerprint: `${quote.price}|${quote.changePct}|${quote.source}`,
    })),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-muted">
            <th className="pb-3 pr-4 font-medium">Symbol</th>
            <th className="pb-3 pr-4 text-right font-medium">Price</th>
            <th className="pb-3 pr-4 text-right font-medium">Today</th>
            <th className="pb-3 pr-4 text-right font-medium">1 month</th>
            <th className="hidden pb-3 text-right font-medium md:table-cell">
              Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {quotes.map((quote) => (
            <tr
              key={quote.symbol}
              className={`${flashIds.has(quote.symbol) ? "quote-flash" : ""} ${
                quote.source === "fallback" ? "opacity-55" : ""
              }`}
            >
              <td className="py-2.5 pr-4">
                <p className="font-mono font-medium">{quote.symbol}</p>
                <p className="max-w-72 truncate text-xs text-muted">
                  {quote.name}
                </p>
              </td>
              <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                {usd.format(quote.price)}
              </td>
              <td
                className={`py-2.5 pr-4 text-right tabular-nums ${
                  quote.changePct > 0
                    ? "text-accent"
                    : quote.changePct < 0
                      ? "text-negative"
                      : "text-muted"
                }`}
              >
                {quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex justify-end">
                  <Sparkline values={quote.sparkline} />
                </div>
              </td>
              <td className="hidden py-2.5 text-right md:table-cell">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    quote.source === "live"
                      ? "border-accent/30 bg-accent/5 text-accent"
                      : "border-gold/30 bg-gold/5 text-gold"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      quote.source === "live" ? "bg-accent" : "bg-gold"
                    }`}
                  />
                  {quote.source}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
