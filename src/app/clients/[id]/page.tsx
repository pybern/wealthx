import Link from "next/link";
import { notFound } from "next/navigation";
import { CLIENTS, getClient } from "@/lib/data/clients";
import { buildInsights } from "@/lib/insights";
import {
  allocationDrift,
  fmtCompact,
  fmtNum,
  fmtPct,
  fmtUsd,
  getPortfolio,
} from "@/lib/portfolio";
import { isZenConfigured } from "@/lib/ai/zen";
import { AllocationDonut } from "@/components/AllocationDonut";
import { AiWorkbench } from "@/components/AiWorkbench";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, ChangePct, Pill, SeverityBadge, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CLIENTS.map((c) => ({ id: c.id }));
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const portfolio = await getPortfolio(client);
  const insights = buildInsights(client, portfolio, new Date());
  const drift = allocationDrift(client, portfolio).filter(
    (d) => Math.abs(d.drift) >= 2,
  );

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="text-xs text-muted hover:text-accent">
            ← All clients
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {client.age} · {client.occupation} · {client.city}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{client.segment}</Pill>
            <Pill>{client.riskProfile}</Pill>
            <Pill>Client since {client.clientSince}</Pill>
            <Pill>Next review {client.nextReviewDue}</Pill>
          </div>
        </div>
        <div className="text-right text-sm text-muted">
          <p>{client.email}</p>
          <p>{client.phone}</p>
          <p className="mt-1">Last contact {client.lastContact}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Total value"
          value={fmtCompact(portfolio.totalValue)}
          sub={`${fmtCompact(portfolio.dayChange)} (${fmtPct(portfolio.dayChangePct)}) today`}
          subTone={portfolio.dayChange >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Unrealized gain"
          value={fmtCompact(portfolio.totalGain)}
          sub={fmtPct(portfolio.totalGainPct, 1)}
          subTone={portfolio.totalGain >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Cash"
          value={fmtCompact(portfolio.cash)}
          sub={`${((portfolio.cash / portfolio.totalValue) * 100).toFixed(1)}% of portfolio`}
          subTone="neutral"
        />
        <Stat
          label="Open alerts"
          value={String(insights.length)}
          sub={`${insights.filter((i) => i.severity === "action").length} need action`}
          subTone={
            insights.some((i) => i.severity === "action")
              ? "negative"
              : "positive"
          }
        />
      </div>

      <Card title="AI workbench — powered by Open Code Zen">
        <AiWorkbench clientId={client.id} configured={isZenConfigured()} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Asset allocation" className="xl:col-span-3">
          <AllocationDonut allocation={portfolio.allocation} />
          {drift.length > 0 && (
            <div className="mt-5 border-t border-edge pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Drift vs {client.riskProfile} target
              </p>
              <ul className="space-y-1 text-sm">
                {drift.map((d) => (
                  <li
                    key={d.assetClass}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted">{d.assetClass}</span>
                    <span className="tabular-nums">
                      {d.currentPct.toFixed(1)}%{" "}
                      <span className="text-muted">vs {d.targetPct}%</span>{" "}
                      <span
                        className={
                          d.drift > 0 ? "text-amber-400" : "text-sky-400"
                        }
                      >
                        ({d.drift > 0 ? "+" : ""}
                        {d.drift.toFixed(1)}pp)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Alerts & insights" className="xl:col-span-2">
          <ul className="space-y-3.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3">
                <SeverityBadge severity={insight.severity} />
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {insight.detail}
                  </p>
                </div>
              </li>
            ))}
            {insights.length === 0 && (
              <li className="text-sm text-muted">No open alerts.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="Holdings (live prices)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 pr-4 font-medium">Position</th>
              <th className="pb-3 pr-4 font-medium">Account</th>
              <th className="pb-3 pr-4 text-right font-medium">Qty</th>
              <th className="pb-3 pr-4 text-right font-medium">Price</th>
              <th className="pb-3 pr-4 text-right font-medium">Today</th>
              <th className="pb-3 pr-4 text-right font-medium">Value</th>
              <th className="pb-3 pr-4 text-right font-medium">Weight</th>
              <th className="pb-3 text-right font-medium">Unrealized</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {portfolio.holdings.map((h) => (
              <tr key={`${h.symbol}-${h.account}`}>
                <td className="py-3 pr-4">
                  <p className="font-mono font-medium">{h.symbol}</p>
                  <p className="max-w-56 truncate text-xs text-muted">
                    {h.product.name}
                  </p>
                </td>
                <td className="py-3 pr-4 text-muted">{h.account}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {fmtNum(h.quantity)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {fmtUsd(h.quote.price, 2)}
                </td>
                <td className="py-3 pr-4 text-right">
                  <ChangePct value={h.quote.changePct} />
                </td>
                <td className="py-3 pr-4 text-right font-medium tabular-nums">
                  {fmtCompact(h.marketValue)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {h.weightPct.toFixed(1)}%
                </td>
                <td className="py-3 text-right">
                  <ChangePct value={h.gainPct} digits={1} />
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-3 pr-4">
                <p className="font-mono font-medium">CASH</p>
                <p className="text-xs text-muted">USD sweep / money market</p>
              </td>
              <td className="py-3 pr-4 text-muted">—</td>
              <td className="py-3 pr-4 text-right tabular-nums">—</td>
              <td className="py-3 pr-4 text-right tabular-nums">$1.00</td>
              <td className="py-3 pr-4 text-right text-muted">—</td>
              <td className="py-3 pr-4 text-right font-medium tabular-nums">
                {fmtCompact(portfolio.cash)}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums text-muted">
                {((portfolio.cash / portfolio.totalValue) * 100).toFixed(1)}%
              </td>
              <td className="py-3 text-right text-muted">—</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Goals">
          <ul className="space-y-4">
            {client.goals.map((goal) => (
              <li key={goal.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{goal.name}</p>
                  <p className="shrink-0 text-xs text-muted">
                    {fmtCompact(goal.targetAmount)} by {goal.targetYear}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(goal.fundedPct, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {goal.fundedPct}% funded · {goal.priority} priority
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Advisor notes">
          <ul className="space-y-3">
            {client.notes.map((note, i) => (
              <li key={i}>
                <p className="text-xs text-muted">{note.date}</p>
                <p className="mt-0.5 text-sm leading-relaxed">{note.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-edge pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Personal
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {client.personal}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {client.interests.map((interest) => (
                <Pill key={interest}>{interest}</Pill>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Recent activity">
          <ul className="space-y-3">
            {client.activities.map((activity, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{activity.type}</span>
                    <span className="text-muted"> · {activity.date}</span>
                  </p>
                  <p className="text-xs text-muted">{activity.description}</p>
                </div>
                {activity.amount !== undefined && (
                  <p className="shrink-0 text-sm tabular-nums text-muted">
                    {fmtCompact(activity.amount)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
