import Link from "next/link";
import { CLIENTS } from "@/lib/data/clients";
import { buildInsights } from "@/lib/insights";
import { fmtCompact, getPortfolios } from "@/lib/portfolio";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, ChangePct, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const portfolios = await getPortfolios(CLIENTS);
  const today = new Date();

  const rows = CLIENTS.map((client) => {
    const portfolio = portfolios.get(client.id)!;
    const insights = buildInsights(client, portfolio, today);
    return { client, portfolio, insights };
  }).sort((a, b) => b.portfolio.totalValue - a.portfolio.totalValue);

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          {CLIENTS.length} households, live-priced. Sorted by AUM.
        </p>
      </header>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 pr-4 font-medium">Client</th>
              <th className="pb-3 pr-4 font-medium">Segment</th>
              <th className="pb-3 pr-4 font-medium">Risk profile</th>
              <th className="pb-3 pr-4 text-right font-medium">AUM</th>
              <th className="pb-3 pr-4 text-right font-medium">Today</th>
              <th className="pb-3 pr-4 text-right font-medium">Cash</th>
              <th className="pb-3 text-right font-medium">Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.map(({ client, portfolio, insights }) => {
              const actions = insights.filter(
                (i) => i.severity === "action",
              ).length;
              return (
                <tr key={client.id} className="group">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium group-hover:text-accent"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {client.city} · since {client.clientSince}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Pill>{client.segment}</Pill>
                  </td>
                  <td className="py-3 pr-4 text-muted">{client.riskProfile}</td>
                  <td className="py-3 pr-4 text-right font-medium tabular-nums">
                    {fmtCompact(portfolio.totalValue)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <ChangePct value={portfolio.dayChangePct} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted">
                    {fmtCompact(portfolio.cash)}
                  </td>
                  <td className="py-3 text-right">
                    {insights.length > 0 ? (
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                          actions > 0
                            ? "bg-red-500/15 text-red-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {insights.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
