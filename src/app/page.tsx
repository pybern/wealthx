import Link from "next/link";
import { CLIENTS } from "@/lib/data/clients";
import { MARKET_INDICES } from "@/lib/data/products";
import { buildBookInsights } from "@/lib/insights";
import { fmtCompact, fmtPct, getPortfolios } from "@/lib/portfolio";
import { getQuotes } from "@/lib/market/quotes";
import { buildMarketSignals } from "@/lib/market/signals";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SignalFeed } from "@/components/SignalFeed";
import { Card, ChangePct, SeverityBadge, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [portfolios, indexQuotes, marketSignals] = await Promise.all([
    getPortfolios(CLIENTS),
    getQuotes(MARKET_INDICES.map((i) => i.symbol)),
    buildMarketSignals(),
  ]);

  const totalAum = [...portfolios.values()].reduce(
    (sum, p) => sum + p.totalValue,
    0,
  );
  const dayChange = [...portfolios.values()].reduce(
    (sum, p) => sum + p.dayChange,
    0,
  );
  const dayChangePct = totalAum ? (dayChange / (totalAum - dayChange)) * 100 : 0;
  const totalCash = [...portfolios.values()].reduce((sum, p) => sum + p.cash, 0);

  const insights = buildBookInsights(CLIENTS, portfolios, new Date());
  const actionCount = insights.filter((i) => i.severity === "action").length;

  const movers = CLIENTS.map((client) => ({
    client,
    portfolio: portfolios.get(client.id)!,
  })).sort(
    (a, b) =>
      Math.abs(b.portfolio.dayChangePct) - Math.abs(a.portfolio.dayChangePct),
  );

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Good morning</h1>
          <p className="mt-1 text-sm text-muted">
            Your book at a glance — live prices, refreshed every minute.
          </p>
        </div>
        <Link
          href="/assistant"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black"
        >
          ✦ Ask the Copilot
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Total AUM"
          value={fmtCompact(totalAum)}
          sub={`${fmtCompact(dayChange)} (${fmtPct(dayChangePct)}) today`}
          subTone={dayChange >= 0 ? "positive" : "negative"}
        />
        <Stat label="Households" value={String(CLIENTS.length)} sub="Across 3 segments" />
        <Stat
          label="Uninvested cash"
          value={fmtCompact(totalCash)}
          sub={`${((totalCash / totalAum) * 100).toFixed(1)}% of AUM`}
          subTone="neutral"
        />
        <Stat
          label="Open alerts"
          value={String(insights.length)}
          sub={`${actionCount} need action`}
          subTone={actionCount > 0 ? "negative" : "positive"}
        />
      </div>

      <Card
        title="Live signals"
        action={
          <Link href="/markets" className="text-xs text-accent">
            View all signals →
          </Link>
        }
      >
        <SignalFeed signals={marketSignals.signals.slice(0, 4)} />
      </Card>

      <Card title="Market pulse">
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {MARKET_INDICES.map(({ symbol, label }) => {
            const quote = indexQuotes.get(symbol);
            if (!quote) return null;
            const isYield = symbol === "^TNX";
            return (
              <div key={symbol}>
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                  {isYield
                    ? `${quote.price.toFixed(2)}%`
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Portfolio movers today"
          action={
            <Link href="/clients" className="text-xs text-accent">
              All clients →
            </Link>
          }
        >
          <ul className="divide-y divide-edge">
            {movers.slice(0, 6).map(({ client, portfolio }) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {client.name}
                    </p>
                    <p className="text-xs text-muted">
                      {client.riskProfile} · {fmtCompact(portfolio.totalValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <ChangePct value={portfolio.dayChangePct} />
                    <p className="text-xs tabular-nums text-muted">
                      {fmtCompact(portfolio.dayChange)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Intelligence feed">
          <ul className="space-y-3">
            {insights.slice(0, 7).map((insight, i) => (
              <li key={i} className="flex items-start gap-3">
                <SeverityBadge severity={insight.severity} />
                <div className="min-w-0">
                  <Link
                    href={`/clients/${insight.clientId}`}
                    className="text-sm font-medium hover:text-accent"
                  >
                    {insight.clientName}
                    <span className="text-muted"> · {insight.category}</span>
                  </Link>
                  <p className="text-sm text-muted">{insight.title}</p>
                </div>
              </li>
            ))}
            {insights.length === 0 && (
              <li className="text-sm text-muted">No open alerts. 🎉</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
