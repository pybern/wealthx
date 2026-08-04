import { MARKET_INDICES, PRODUCTS, WATCHLIST } from "@/lib/data/products";
import { CLIENTS } from "@/lib/data/clients";
import { getFxRates, getQuotes, getSparkline } from "@/lib/market/quotes";
import { getMarketNews } from "@/lib/market/news";
import { buildMarketSignals } from "@/lib/market/signals";
import { isZenConfigured } from "@/lib/ai/zen";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DataSourceHealth } from "@/components/DataSourceHealth";
import { MarketPulse } from "@/components/MarketPulse";
import { NewsFeed } from "@/components/NewsFeed";
import { QuoteFlash } from "@/components/QuoteFlash";
import { SignalActivityTimeline } from "@/components/SignalActivityTimeline";
import { SignalFeed } from "@/components/SignalFeed";
import { WatchlistTable } from "@/components/WatchlistTable";
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
  const yahooSymbols = symbols.filter(
    (symbol) => symbol !== "BTC" && symbol !== "ETH",
  );
  const yahooLive = yahooSymbols.filter(
    (symbol) => quotes.get(symbol)?.source === "live",
  ).length;
  const cryptoSymbols = ["BTC", "ETH"];
  const cryptoLive = cryptoSymbols.filter(
    (symbol) => quotes.get(symbol)?.source === "live",
  ).length;
  const watchlistQuotes = WATCHLIST.flatMap((symbol) => {
    const quote = quotes.get(symbol);
    if (!quote) return [];
    return [
      {
        symbol,
        name: quote.name,
        price: quote.price,
        changePct: quote.changePct,
        source: quote.source,
        sparkline: sparklines.get(symbol) ?? [],
      },
    ];
  });
  const sources = [
    {
      name: "Yahoo Finance",
      detail: `${yahooLive}/${yahooSymbols.length} equity, index and commodity quotes live`,
      state: yahooLive === yahooSymbols.length ? "live" : "fallback",
    },
    {
      name: "CoinGecko",
      detail: `${cryptoLive}/${cryptoSymbols.length} crypto quotes live`,
      state: cryptoLive === cryptoSymbols.length ? "live" : "fallback",
    },
    {
      name: "ECB / Frankfurter",
      detail: `${fx.source === "live" ? "Current" : "Fallback"} reference rates · ${fx.date}`,
      state: fx.source === "live" ? "live" : "fallback",
    },
    {
      name: "Market news",
      detail: news.length > 0 ? `${news.length} recent headlines` : "No fresh headlines",
      state: news.length > 0 ? "live" : "stale",
    },
  ] as const;

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
          Snapshot coverage: {liveCount}/{quotes.size} live
        </p>
      </header>

      <DataSourceHealth sources={[...sources]} />

      <Card title="Indices, rates & commodities">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-8">
          {MARKET_INDICES.map(({ symbol, label }) => {
            const quote = quotes.get(symbol);
            if (!quote) return null;
            const isYield = symbol === "^TNX";
            return (
              <QuoteFlash
                key={symbol}
                id={symbol}
                fingerprint={`${quote.price}|${quote.changePct}|${quote.source}`}
                className={`p-1.5 ${
                  quote.source === "fallback" ? "opacity-55" : ""
                }`}
              >
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {isYield
                    ? `${quote.price.toFixed(3)}%`
                    : quote.price.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                </p>
                <ChangePct value={quote.changePct} />
                <p
                  className={`mt-1 text-[9px] uppercase tracking-wider ${
                    quote.source === "live" ? "text-accent" : "text-gold"
                  }`}
                >
                  {quote.source}
                </p>
              </QuoteFlash>
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
        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <SignalFeed signals={signals.signals} />
          <SignalActivityTimeline signals={signals.signals} />
        </div>
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
        <WatchlistTable quotes={watchlistQuotes} />
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
