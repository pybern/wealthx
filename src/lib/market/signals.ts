import "server-only";

import type { Quote } from "../types";
import { MARKET_INDICES, PRODUCT_MAP, WATCHLIST } from "../data/products";
import { CLIENTS } from "../data/clients";
import { fmtCompact, getPortfolios } from "../portfolio";
import { getQuotes } from "./quotes";

/**
 * Deterministic live-market signals derived from real-time quotes, with
 * book-of-business exposure attached so an RM immediately sees who is
 * affected. Rebuilt on every request (quotes are cached ~60s upstream).
 */

export type SignalDirection = "up" | "down" | "neutral";

export interface MarketSignal {
  id: string;
  category: "Index" | "Volatility" | "Rates" | "Commodities" | "Holdings" | "Range" | "Crypto";
  direction: SignalDirection;
  /** Sort key — higher is more notable. */
  strength: number;
  title: string;
  detail: string;
  symbol?: string;
}

const INDEX_MOVE_PCT = 0.75;
const VIX_ELEVATED = 20;
const VIX_STRESSED = 28;
const VIX_SPIKE_PCT = 8;
const YIELD_MOVE_BP = 5;
const COMMODITY_MOVE_PCT = 1.5;
const HOLDING_MOVE_PCT = 2;
const CRYPTO_MOVE_PCT = 3;
const RANGE_PROXIMITY_PCT = 1.5;

interface BookExposure {
  value: number;
  clientCount: number;
}

function direction(changePct: number): SignalDirection {
  return changePct > 0 ? "up" : changePct < 0 ? "down" : "neutral";
}

function pct(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/** Total live-priced value and holder count per symbol across the book. */
async function getBookExposure(): Promise<Map<string, BookExposure>> {
  const portfolios = await getPortfolios(CLIENTS);
  const exposure = new Map<string, BookExposure>();
  for (const portfolio of portfolios.values()) {
    for (const holding of portfolio.holdings) {
      const prev = exposure.get(holding.symbol) ?? {
        value: 0,
        clientCount: 0,
      };
      exposure.set(holding.symbol, {
        value: prev.value + holding.marketValue,
        clientCount: prev.clientCount + 1,
      });
    }
  }
  return exposure;
}

function exposureNote(exposure: BookExposure | undefined): string {
  if (!exposure || exposure.clientCount === 0) return "";
  return ` Book exposure: ${fmtCompact(exposure.value)} across ${exposure.clientCount} client${exposure.clientCount === 1 ? "" : "s"}.`;
}

function indexSignals(quotes: Map<string, Quote>): MarketSignal[] {
  const signals: MarketSignal[] = [];

  for (const { symbol, label } of MARKET_INDICES) {
    const quote = quotes.get(symbol);
    // Never derive signals from fallback baselines — their day-change is a
    // stale spread, not a real market move.
    if (!quote || quote.source !== "live") continue;

    if (symbol === "^VIX") {
      const level = quote.price;
      if (level >= VIX_STRESSED || level >= VIX_ELEVATED) {
        signals.push({
          id: "vix-level",
          category: "Volatility",
          direction: "down",
          strength: level,
          title:
            level >= VIX_STRESSED
              ? `VIX at ${level.toFixed(1)} — stressed market`
              : `VIX at ${level.toFixed(1)} — elevated volatility`,
          detail: `The VIX is ${pct(quote.changePct)} today. Expect clients to notice headlines; proactive outreach calms nerves.`,
          symbol,
        });
      } else if (Math.abs(quote.changePct) >= VIX_SPIKE_PCT) {
        signals.push({
          id: "vix-spike",
          category: "Volatility",
          direction: quote.changePct > 0 ? "down" : "up",
          strength: Math.abs(quote.changePct) / 2,
          title: `VIX ${quote.changePct > 0 ? "spiking" : "easing"} ${pct(quote.changePct)} to ${quote.price.toFixed(1)}`,
          detail:
            quote.changePct > 0
              ? "Volatility is picking up intraday even though the absolute level remains contained."
              : "Volatility is bleeding off — a supportive backdrop for risk assets.",
          symbol,
        });
      }
      continue;
    }

    if (symbol === "^TNX") {
      const moveBp = (quote.price - quote.prevClose) * 100;
      if (Math.abs(moveBp) >= YIELD_MOVE_BP) {
        signals.push({
          id: "yield-move",
          category: "Rates",
          direction: moveBp > 0 ? "up" : "down",
          strength: Math.abs(moveBp) / 2,
          title: `10Y Treasury yield ${moveBp > 0 ? "up" : "down"} ${Math.abs(moveBp).toFixed(0)}bp to ${quote.price.toFixed(2)}%`,
          detail:
            moveBp > 0
              ? "Rising yields pressure long-duration bonds (TLT, AGG) and growth equities. Duration-heavy portfolios are most exposed."
              : "Falling yields support bond prices and long-duration assets — a tailwind for fixed-income sleeves.",
          symbol,
        });
      }
      continue;
    }

    const isCommodity = symbol.endsWith("=F");
    const threshold = isCommodity ? COMMODITY_MOVE_PCT : INDEX_MOVE_PCT;
    if (Math.abs(quote.changePct) >= threshold) {
      signals.push({
        id: `move-${symbol}`,
        category: isCommodity ? "Commodities" : "Index",
        direction: direction(quote.changePct),
        strength: Math.abs(quote.changePct),
        title: `${label} ${quote.changePct > 0 ? "up" : "down"} ${pct(quote.changePct)} today`,
        detail: `${label} is at ${quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}. ${
          quote.changePct > 0
            ? "A constructive tape for equity-heavy portfolios."
            : "Expect day-change dips across equity allocations."
        }`,
        symbol,
      });
    }
  }
  return signals;
}

function holdingSignals(
  quotes: Map<string, Quote>,
  exposure: Map<string, BookExposure>,
  symbols: string[],
): MarketSignal[] {
  const signals: MarketSignal[] = [];
  for (const symbol of symbols) {
    const quote = quotes.get(symbol);
    if (!quote || quote.source !== "live") continue;
    const product = PRODUCT_MAP.get(symbol);
    const held = exposure.get(symbol);
    const isCrypto = product?.kind === "Crypto";
    const threshold = isCrypto ? CRYPTO_MOVE_PCT : HOLDING_MOVE_PCT;

    if (Math.abs(quote.changePct) >= threshold) {
      signals.push({
        id: `mover-${symbol}`,
        category: isCrypto ? "Crypto" : "Holdings",
        direction: direction(quote.changePct),
        // Weight held names above watchlist-only names.
        strength: Math.abs(quote.changePct) * (held ? 1.5 : 0.75),
        title: `${symbol} ${quote.changePct > 0 ? "rallying" : "selling off"} ${pct(quote.changePct)}`,
        detail: `${quote.name} trades at $${quote.price.toFixed(2)}.${exposureNote(held)}`,
        symbol,
      });
      continue;
    }

    // 52-week range proximity — only worth surfacing for held names.
    if (held && quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow) {
      const toHighPct =
        ((quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh) * 100;
      const toLowPct =
        ((quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow) * 100;
      if (toHighPct <= RANGE_PROXIMITY_PCT) {
        signals.push({
          id: `high-${symbol}`,
          category: "Range",
          direction: "up",
          strength: 1.2,
          title: `${symbol} within ${Math.max(toHighPct, 0).toFixed(1)}% of its 52-week high`,
          detail: `${quote.name} at $${quote.price.toFixed(2)} vs 52w high $${quote.fiftyTwoWeekHigh.toFixed(2)}. Consider trimming overweight positions or resetting cost-basis conversations.${exposureNote(held)}`,
          symbol,
        });
      } else if (toLowPct <= RANGE_PROXIMITY_PCT) {
        signals.push({
          id: `low-${symbol}`,
          category: "Range",
          direction: "down",
          strength: 1.6,
          title: `${symbol} within ${Math.max(toLowPct, 0).toFixed(1)}% of its 52-week low`,
          detail: `${quote.name} at $${quote.price.toFixed(2)} vs 52w low $${quote.fiftyTwoWeekLow.toFixed(2)}. Screen for tax-loss harvesting and averaging-in opportunities.${exposureNote(held)}`,
          symbol,
        });
      }
    }
  }
  return signals;
}

export interface MarketSignalsResult {
  signals: MarketSignal[];
  /** ISO timestamp of when the snapshot was assembled. */
  asOf: string;
}

const MAX_SIGNALS = 10;

export async function buildMarketSignals(): Promise<MarketSignalsResult> {
  const heldSymbols = [
    ...new Set(CLIENTS.flatMap((c) => c.holdings.map((h) => h.symbol))),
  ];
  const scanSymbols = [...new Set([...WATCHLIST, ...heldSymbols])];

  const [quotes, exposure] = await Promise.all([
    getQuotes([...MARKET_INDICES.map((i) => i.symbol), ...scanSymbols]),
    getBookExposure(),
  ]);

  const signals = [
    ...indexSignals(quotes),
    ...holdingSignals(quotes, exposure, scanSymbols),
  ]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_SIGNALS);

  return { signals, asOf: new Date().toISOString() };
}

/** Plain-text rendering of the signal feed for AI prompt grounding. */
export function signalsText(result: MarketSignalsResult): string {
  if (result.signals.length === 0) {
    return "No notable market signals right now — a quiet tape.";
  }
  return result.signals
    .map((s) => `- [${s.category}] ${s.title}. ${s.detail}`)
    .join("\n");
}
