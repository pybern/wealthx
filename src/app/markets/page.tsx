import { MARKET_INDICES, PRODUCTS, WATCHLIST } from "@/lib/data/products";
import { CLIENTS } from "@/lib/data/clients";
import { getFxRates, getQuotes, getSparkline } from "@/lib/market/quotes";
import { getMarketNews } from "@/lib/market/news";
import { buildMarketSignals } from "@/lib/market/signals";
import { isZenConfigured } from "@/lib/ai/zen";
import { fmtUsd } from "@/lib/portfolio";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MarketPulse } from "@/components/MarketPulse";
import { NewsFeed } from "@/components/NewsFeed";
import { SignalFeed } from "@/components/SignalFeed";
import { Sparkline } from "@/components/Sparkline";
import { Card, ChangePct } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const symbols = [...MARKET_INDICES.map((i) => i.symbol), ...WATCHLIST];
  const [quotes, fx, sparklines, signals, news] = await Promise.all([
    getQuotes(symbols),
    getFxRates(),
    Promise.all(
      WATCHLIST.map(async (s) => [s, await getSparkline(s)] as const),
    ).then((entries) => new Map(entries)),
    buildMarketSignals(),
    getMarketNews(),
  ]);
  const heldSymbols = [
    ...new Set(CLIENTS.flatMap((c) => c.holdings.map((h) => h.symbol))),
  ];

  const liveCount = [...quotes.values()].filter(
    (q) => q.source === "live",
  ).length;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Markets</h1>
          <p className="mt-1 text-sm text-muted">
            Live data from Yahoo Finance, CoinGecko and the ECB (Frankfurter).
            Auto-refreshes every minute.
          </p>
        </div>
        <p className="text-xs text-muted">
          {liveCount}/{quotes.size} quotes live
        </p>
      </header>

      <Card title="Indices, rates & commodities">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-8">
          {MARKET_INDICES.map(({ symbol, label }) => {
            const quote = quotes.get(symbol);
            if (!quote) return null;
            const isYield = symbol === "^TNX";
            return (
              <div key={symbol}>
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {isYield
                    ? `${quote.price.toFixed(3)}%`
                    : quote.price.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                </p>
                <ChangePct value={quote.changePct} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title="Live signals"
        action={
          <p className="text-xs text-muted">
            Derived from live quotes + book exposure
          </p>
        }
      >
        <SignalFeed signals={signals.signals} />
      </Card>

      <Card
        title="Market news"
        action={
          <p className="text-xs text-muted">
            Live headlines · tickers in your book highlighted
          </p>
        }
      >
        <NewsFeed items={news} heldSymbols={heldSymbols} />
      </Card>

      <Card title="AI market pulse">
        <MarketPulse configured={isZenConfigured()} />
      </Card>

      <Card title="Watchlist">
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
            {WATCHLIST.map((symbol) => {
              const quote = quotes.get(symbol);
              if (!quote) return null;
              return (
                <tr key={symbol}>
                  <td className="py-2.5 pr-4">
                    <p className="font-mono font-medium">{symbol}</p>
                    <p className="max-w-72 truncate text-xs text-muted">
                      {quote.name}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                    {fmtUsd(quote.price, 2)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <ChangePct value={quote.changePct} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex justify-end">
                      <Sparkline values={sparklines.get(symbol) ?? []} />
                    </div>
                  </td>
                  <td className="hidden py-2.5 text-right text-xs text-muted md:table-cell">
                    {quote.source}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title={`FX — USD crosses (ECB reference, ${fx.date})`}>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-8">
          {Object.entries(fx.rates).map(([currency, rate]) => (
            <div key={currency}>
              <p className="text-xs text-muted">USD/{currency}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {rate.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Coverage note">
        <p className="text-sm leading-relaxed text-muted">
          Equity, ETF and index quotes come from the public Yahoo Finance
          chart API; crypto from CoinGecko; FX from Frankfurter (ECB
          reference rates). All sources are free and keyless. Quotes marked{" "}
          <span className="font-mono">fallback</span> use the last-known
          baseline when a source is unreachable. Product list:{" "}
          {PRODUCTS.length} real instruments.
        </p>
      </Card>
    </div>
  );
}
