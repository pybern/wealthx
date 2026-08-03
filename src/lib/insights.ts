import type { Client, Insight, PortfolioSummary } from "./types";
import { allocationDrift, fmtCompact, fmtPct } from "./portfolio";

const DRIFT_THRESHOLD_PP = 8;
const CONCENTRATION_THRESHOLD_PCT = 20;
const CASH_DRAG_THRESHOLD_PCT = 12;
const DAY_MOVE_THRESHOLD_PCT = 1.5;
const LOSS_HARVEST_MIN_USD = 10_000;
const CONTACT_STALE_DAYS = 60;

/**
 * Deterministic, rule-based intelligence over a client's live-priced
 * portfolio. `today` is passed in by the caller so results stay
 * reproducible for a given date.
 */
export function buildInsights(
  client: Client,
  portfolio: PortfolioSummary,
  today: Date,
): Insight[] {
  const insights: Insight[] = [];
  const base = { clientId: client.id, clientName: client.name };

  // Review overdue / imminent
  const reviewDue = new Date(client.nextReviewDue);
  const daysToReview = Math.floor(
    (reviewDue.getTime() - today.getTime()) / 86_400_000,
  );
  if (daysToReview < 0) {
    insights.push({
      ...base,
      severity: "action",
      category: "Review",
      title: `Portfolio review overdue by ${-daysToReview} days`,
      detail: `The scheduled review date was ${client.nextReviewDue}. Book a meeting as soon as possible.`,
    });
  } else if (daysToReview <= 14) {
    insights.push({
      ...base,
      severity: "warning",
      category: "Review",
      title: `Review due in ${daysToReview} days`,
      detail: `Scheduled review on ${client.nextReviewDue}. Prepare the agenda and meeting brief.`,
    });
  }

  // Stale contact
  const lastContact = new Date(client.lastContact);
  const daysSinceContact = Math.floor(
    (today.getTime() - lastContact.getTime()) / 86_400_000,
  );
  if (daysSinceContact > CONTACT_STALE_DAYS) {
    insights.push({
      ...base,
      severity: "warning",
      category: "Engagement",
      title: `No contact in ${daysSinceContact} days`,
      detail: `Last touchpoint was ${client.lastContact}. A proactive check-in protects the relationship.`,
    });
  }

  // Concentration risk
  for (const holding of portfolio.holdings) {
    if (
      holding.weightPct >= CONCENTRATION_THRESHOLD_PCT &&
      holding.product.kind === "Stock"
    ) {
      insights.push({
        ...base,
        severity: "action",
        category: "Risk",
        title: `${holding.symbol} is ${holding.weightPct.toFixed(0)}% of the portfolio`,
        detail: `${holding.product.name} (${fmtCompact(holding.marketValue)}) exceeds the ${CONCENTRATION_THRESHOLD_PCT}% single-stock guideline. Consider staged diversification, exchange funds or hedging.`,
      });
    }
  }

  // Allocation drift vs target
  const drifts = allocationDrift(client, portfolio).filter(
    (d) => Math.abs(d.drift) >= DRIFT_THRESHOLD_PP,
  );
  for (const d of drifts.slice(0, 2)) {
    insights.push({
      ...base,
      severity: "warning",
      category: "Allocation",
      title: `${d.assetClass} ${d.drift > 0 ? "overweight" : "underweight"} by ${Math.abs(d.drift).toFixed(0)}pp`,
      detail: `Current ${d.currentPct.toFixed(1)}% vs ${d.targetPct.toFixed(0)}% target for a ${client.riskProfile} profile. Rebalancing trade may be warranted.`,
    });
  }

  // Cash drag
  const cashPct = portfolio.totalValue
    ? (portfolio.cash / portfolio.totalValue) * 100
    : 0;
  if (cashPct >= CASH_DRAG_THRESHOLD_PCT) {
    insights.push({
      ...base,
      severity: "action",
      category: "Cash",
      title: `${cashPct.toFixed(0)}% sitting in cash (${fmtCompact(portfolio.cash)})`,
      detail: `Uninvested cash is well above the target for a ${client.riskProfile} profile. Propose a deployment or dollar-cost-averaging plan.`,
    });
  }

  // Large daily move
  if (Math.abs(portfolio.dayChangePct) >= DAY_MOVE_THRESHOLD_PCT) {
    insights.push({
      ...base,
      severity: "info",
      category: "Market",
      title: `Portfolio moved ${fmtPct(portfolio.dayChangePct)} today`,
      detail: `Day change of ${fmtCompact(portfolio.dayChange)}. Consider a proactive note before the client calls you.`,
    });
  }

  // Tax-loss harvesting candidates (taxable accounts only)
  const harvestable = portfolio.holdings.filter(
    (h) => h.account === "Taxable" && h.gain <= -LOSS_HARVEST_MIN_USD,
  );
  for (const h of harvestable.slice(0, 2)) {
    insights.push({
      ...base,
      severity: "info",
      category: "Tax",
      title: `Tax-loss harvest candidate: ${h.symbol} (${fmtCompact(h.gain)})`,
      detail: `${h.product.name} is ${h.gainPct.toFixed(1)}% below cost in a taxable account. Harvesting could offset realized gains — watch the wash-sale window.`,
    });
  }

  // RMD awareness (RMD age 73 under SECURE 2.0)
  const hasTradIra = client.holdings.some(
    (h) => h.account === "Traditional IRA" || h.account === "401(k)",
  );
  if (client.age >= 73 && hasTradIra) {
    insights.push({
      ...base,
      severity: "warning",
      category: "Planning",
      title: "RMD required this year",
      detail: `Client is ${client.age} with tax-deferred accounts. Confirm the required minimum distribution is scheduled before year-end (consider QCD for charitable clients).`,
    });
  } else if (client.age === 72 && hasTradIra) {
    insights.push({
      ...base,
      severity: "info",
      category: "Planning",
      title: "RMDs begin next year",
      detail: "Client turns 73 next year. Start planning distribution strategy and tax-bracket management now.",
    });
  }

  const severityRank = { action: 0, warning: 1, info: 2 } as const;
  return insights.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

export function buildBookInsights(
  clients: Client[],
  portfolios: Map<string, PortfolioSummary>,
  today: Date,
): Insight[] {
  const all = clients.flatMap((client) => {
    const portfolio = portfolios.get(client.id);
    return portfolio ? buildInsights(client, portfolio, today) : [];
  });
  const severityRank = { action: 0, warning: 1, info: 2 } as const;
  return all.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
