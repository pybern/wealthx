import "server-only";

import type { Client, Insight, PortfolioSummary, Quote } from "../types";
import { MARKET_INDICES } from "../data/products";
import { CLIENTS } from "../data/clients";
import { buildInsights } from "../insights";
import {
  allocationDrift,
  fmtCompact,
  fmtPct,
  getPortfolio,
  getPortfolios,
} from "../portfolio";
import { getQuotes } from "../market/quotes";

/**
 * Builds grounded, live-data prompt context for the AI copilot so every
 * answer reflects actual market prices and the client's real portfolio
 * state — not the model's stale training data.
 */

function marketSnapshotText(quotes: Map<string, Quote>): string {
  const lines = MARKET_INDICES.map(({ symbol, label }) => {
    const quote = quotes.get(symbol);
    if (!quote) return null;
    const value =
      symbol === "^TNX"
        ? `${quote.price.toFixed(2)}%`
        : quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return `- ${label}: ${value} (${fmtPct(quote.changePct)} today)`;
  }).filter(Boolean);
  return lines.join("\n");
}

export async function getMarketSnapshot(): Promise<string> {
  const quotes = await getQuotes(MARKET_INDICES.map((i) => i.symbol));
  return marketSnapshotText(quotes);
}

export function clientContextText(
  client: Client,
  portfolio: PortfolioSummary,
  insights: Insight[],
): string {
  const holdings = portfolio.holdings
    .map(
      (h) =>
        `  - ${h.symbol} (${h.product.name}, ${h.account}): ${h.quantity.toLocaleString()} units @ $${h.quote.price.toFixed(2)} = ${fmtCompact(h.marketValue)} | weight ${h.weightPct.toFixed(1)}% | unrealized ${fmtPct(h.gainPct, 1)} | today ${fmtPct(h.quote.changePct, 2)}`,
    )
    .join("\n");

  const allocation = portfolio.allocation
    .map((a) => `  - ${a.assetClass}: ${a.pct.toFixed(1)}% (${fmtCompact(a.value)})`)
    .join("\n");

  const drift = allocationDrift(client, portfolio)
    .filter((d) => Math.abs(d.drift) >= 2)
    .map(
      (d) =>
        `  - ${d.assetClass}: ${d.currentPct.toFixed(1)}% vs target ${d.targetPct}% (${d.drift > 0 ? "+" : ""}${d.drift.toFixed(1)}pp)`,
    )
    .join("\n");

  const goals = client.goals
    .map(
      (g) =>
        `  - ${g.name}: target ${fmtCompact(g.targetAmount)} by ${g.targetYear}, ${g.fundedPct}% funded (${g.priority} priority)`,
    )
    .join("\n");

  const notes = client.notes
    .map((n) => `  - [${n.date}] ${n.text}`)
    .join("\n");

  const activities = client.activities
    .map(
      (a) =>
        `  - [${a.date}] ${a.type}: ${a.description}${a.amount ? ` (${fmtCompact(a.amount)})` : ""}`,
    )
    .join("\n");

  const insightText =
    insights
      .map((i) => `  - [${i.severity.toUpperCase()}] ${i.title} — ${i.detail}`)
      .join("\n") || "  - none";

  return `CLIENT PROFILE
Name: ${client.name} | Age: ${client.age} | ${client.occupation} | ${client.city}
Segment: ${client.segment} | Risk profile: ${client.riskProfile} | Client since ${client.clientSince}
Last contact: ${client.lastContact} | Next review due: ${client.nextReviewDue}
Personal: ${client.personal}
Interests: ${client.interests.join(", ")}

PORTFOLIO (live-priced)
Total value: ${fmtCompact(portfolio.totalValue)} | Invested: ${fmtCompact(portfolio.investedValue)} | Cash: ${fmtCompact(portfolio.cash)}
Unrealized gain: ${fmtCompact(portfolio.totalGain)} (${fmtPct(portfolio.totalGainPct, 1)}) | Today: ${fmtCompact(portfolio.dayChange)} (${fmtPct(portfolio.dayChangePct)})

Holdings:
${holdings}

Asset allocation:
${allocation}

Allocation drift vs ${client.riskProfile} target:
${drift || "  - within tolerance"}

GOALS
${goals}

ADVISOR NOTES
${notes}

RECENT ACTIVITY
${activities}

OPEN ALERTS
${insightText}`;
}

export async function buildClientContext(client: Client): Promise<string> {
  const portfolio = await getPortfolio(client);
  const insights = buildInsights(client, portfolio, new Date());
  return clientContextText(client, portfolio, insights);
}

export async function buildBookContext(): Promise<string> {
  const portfolios = await getPortfolios(CLIENTS);
  const rows = CLIENTS.map((client) => {
    const p = portfolios.get(client.id);
    if (!p) return "";
    return `- ${client.name} (id: ${client.id}) | ${client.segment} | ${client.riskProfile} | AUM ${fmtCompact(p.totalValue)} | today ${fmtPct(p.dayChangePct)} | cash ${fmtCompact(p.cash)} | next review ${client.nextReviewDue}`;
  }).join("\n");
  const total = [...portfolios.values()].reduce(
    (sum, p) => sum + p.totalValue,
    0,
  );
  return `BOOK OF BUSINESS (${CLIENTS.length} households, total AUM ${fmtCompact(total)})\n${rows}`;
}

export const RM_SYSTEM_PROMPT = `You are WealthLens Copilot, an AI assistant for wealth-management relationship managers (RMs). You help RMs prepare for client meetings, analyze portfolios, draft communications and spot opportunities and risks.

Guidelines:
- Be precise, professional and concise. Use the RM's perspective ("your client").
- Ground every claim in the live data provided in the context. Never invent holdings, prices or client facts.
- Portfolio values are live market prices; flag notable moves.
- When you make recommendations, explain the reasoning and note that final suitability and compliance review rest with the RM.
- Format responses in clean Markdown with short sections and bullet points.
- This platform uses simulated client data for demonstration; the market data and financial products are real.`;

export type AiTask = "brief" | "email" | "commentary" | "actions";

export const TASK_PROMPTS: Record<AiTask, string> = {
  brief: `Produce a concise pre-meeting brief for the RM covering:
1. Snapshot — who the client is, relationship health, one-line portfolio status
2. Portfolio highlights — performance, notable positions, drift vs target
3. Open items & risks — alerts, unfinished actions from notes
4. Talking points — 4-6 specific, personalized topics (tie to goals, notes, interests and current market conditions)
5. Recommended next steps`,
  email: `Draft a warm, professional check-in email from the RM to this client. Requirements:
- Subject line included
- Reference something personal or recent from the notes/activity to show attentiveness
- Give a one-paragraph portfolio pulse grounded in the live data (no jargon overload)
- Propose one concrete next step or meeting
- Keep it under 220 words. Do not invent facts.`,
  commentary: `Write a portfolio commentary for this client's next quarterly letter:
- Lead with total value and performance context using the live data
- Explain the largest contributors and detractors (positions and asset classes)
- Connect positioning to the client's goals and risk profile
- Close with outlook and any recommended adjustments
- Professional but readable; around 300 words.`,
  actions: `Recommend the top 5 next-best-actions for the RM on this client. For each:
- Action (one line)
- Why now (grounded in the data: alerts, drift, cash, goals, notes)
- Expected impact (client outcome or relationship value)
Order by priority. Be specific — name tickers, amounts and dates where possible.`,
};
