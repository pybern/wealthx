import type {
  AssetClass,
  Client,
  PortfolioSummary,
  PricedHolding,
  Quote,
} from "./types";
import { getProduct, TARGET_ALLOCATIONS } from "./data/products";
import { getQuotes } from "./market/quotes";

export function symbolsForClient(client: Client): string[] {
  return client.holdings.map((h) => h.symbol);
}

export function priceHoldings(
  client: Client,
  quotes: Map<string, Quote>,
): PortfolioSummary {
  const priced: Omit<PricedHolding, "weightPct">[] = client.holdings.map(
    (holding) => {
      const product = getProduct(holding.symbol);
      const quote = quotes.get(holding.symbol);
      if (!quote) throw new Error(`Missing quote for ${holding.symbol}`);
      const marketValue = holding.quantity * quote.price;
      const cost = holding.quantity * holding.costBasis;
      return {
        ...holding,
        product,
        quote,
        marketValue,
        gain: marketValue - cost,
        gainPct: cost ? ((marketValue - cost) / cost) * 100 : 0,
        dayChange: holding.quantity * quote.change,
      };
    },
  );

  const investedValue = priced.reduce((sum, h) => sum + h.marketValue, 0);
  const totalValue = investedValue + client.cash;
  const totalCost = priced.reduce(
    (sum, h) => sum + h.quantity * h.costBasis,
    0,
  );
  const dayChange = priced.reduce((sum, h) => sum + h.dayChange, 0);
  const prevValue = totalValue - dayChange;

  const holdings: PricedHolding[] = priced
    .map((h) => ({
      ...h,
      weightPct: totalValue ? (h.marketValue / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);

  const byClass = new Map<AssetClass, number>();
  for (const h of holdings) {
    byClass.set(
      h.product.assetClass,
      (byClass.get(h.product.assetClass) ?? 0) + h.marketValue,
    );
  }
  if (client.cash > 0) {
    byClass.set("Cash", (byClass.get("Cash") ?? 0) + client.cash);
  }
  const allocation = [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      pct: totalValue ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalValue,
    investedValue,
    cash: client.cash,
    totalGain: investedValue - totalCost,
    totalGainPct: totalCost ? ((investedValue - totalCost) / totalCost) * 100 : 0,
    dayChange,
    dayChangePct: prevValue ? (dayChange / prevValue) * 100 : 0,
    allocation,
    holdings,
  };
}

export async function getPortfolio(client: Client): Promise<PortfolioSummary> {
  const quotes = await getQuotes(symbolsForClient(client));
  return priceHoldings(client, quotes);
}

export async function getPortfolios(
  clients: Client[],
): Promise<Map<string, PortfolioSummary>> {
  const allSymbols = [...new Set(clients.flatMap(symbolsForClient))];
  const quotes = await getQuotes(allSymbols);
  return new Map(clients.map((c) => [c.id, priceHoldings(c, quotes)]));
}

/** Difference between current and target allocation, in percentage points. */
export function allocationDrift(
  client: Client,
  portfolio: PortfolioSummary,
): { assetClass: AssetClass; currentPct: number; targetPct: number; drift: number }[] {
  const targets = TARGET_ALLOCATIONS[client.riskProfile];
  const classes = new Set<AssetClass>([
    ...(Object.keys(targets) as AssetClass[]),
    ...portfolio.allocation.map((a) => a.assetClass),
  ]);
  return [...classes]
    .map((assetClass) => {
      const currentPct =
        portfolio.allocation.find((a) => a.assetClass === assetClass)?.pct ?? 0;
      const targetPct = targets[assetClass] ?? 0;
      return { assetClass, currentPct, targetPct, drift: currentPct - targetPct };
    })
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
}

export const fmtUsd = (value: number, digits = 0): string =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export const fmtCompact = (value: number): string =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });

export const fmtPct = (value: number, digits = 2): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;

export const fmtNum = (value: number, digits = 2): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });
