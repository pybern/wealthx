import "server-only";

import type { FxRates, Quote } from "../types";
import { PRODUCT_MAP } from "../data/products";
import { FALLBACK_FX, FALLBACK_QUOTES } from "./fallback";

/**
 * Live market data from free, keyless public APIs:
 *  - Yahoo Finance chart API  → equities, ETFs, indices
 *  - CoinGecko                → crypto spot prices
 *  - Frankfurter (ECB rates)  → foreign exchange
 *
 * All calls are cached in-memory with a short TTL and degrade to
 * last-known baseline prices when a source is unreachable.
 */

const QUOTE_TTL_MS = 60_000;
const FX_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 6_000;

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const quoteCache = new Map<string, CacheEntry<Quote>>();
const sparklineCache = new Map<string, CacheEntry<number[]>>();
let fxCache: CacheEntry<FxRates> | null = null;

function fallbackQuote(symbol: string): Quote {
  const fb = FALLBACK_QUOTES[symbol];
  const price = fb?.price ?? 100;
  const prevClose = fb?.prevClose ?? 100;
  return {
    symbol,
    name: fb?.name ?? symbol,
    price,
    prevClose,
    change: price - prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    currency: "USD",
    asOf: new Date().toISOString(),
    source: "fallback",
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WealthLens/1.0)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
  regularMarketTime?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

async function fetchYahooQuote(symbol: string): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const json = (await fetchJson(url)) as {
    chart?: { result?: { meta?: YahooChartMeta }[] };
  };
  const meta = json.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error(`No price for ${symbol}`);
  const prevClose =
    meta?.chartPreviousClose ?? meta?.previousClose ?? price;
  return {
    symbol,
    name:
      PRODUCT_MAP.get(symbol)?.name ??
      meta?.longName ??
      meta?.shortName ??
      FALLBACK_QUOTES[symbol]?.name ??
      symbol,
    price,
    prevClose,
    change: price - prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    currency: meta?.currency ?? "USD",
    asOf: meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
    source: "live",
    dayHigh: meta?.regularMarketDayHigh,
    dayLow: meta?.regularMarketDayLow,
    fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta?.fiftyTwoWeekLow,
  };
}

async function fetchCryptoQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const ids = symbols
    .map((s) => PRODUCT_MAP.get(s)?.coingeckoId)
    .filter(Boolean)
    .join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const json = (await fetchJson(url)) as Record<
    string,
    { usd: number; usd_24h_change?: number }
  >;
  const out = new Map<string, Quote>();
  for (const symbol of symbols) {
    const product = PRODUCT_MAP.get(symbol);
    const data = product?.coingeckoId ? json[product.coingeckoId] : undefined;
    if (!data) continue;
    const changePct = data.usd_24h_change ?? 0;
    const prevClose = data.usd / (1 + changePct / 100);
    out.set(symbol, {
      symbol,
      name: product?.name ?? symbol,
      price: data.usd,
      prevClose,
      change: data.usd - prevClose,
      changePct,
      currency: "USD",
      asOf: new Date().toISOString(),
      source: "live",
    });
  }
  return out;
}

function isCrypto(symbol: string): boolean {
  return PRODUCT_MAP.get(symbol)?.kind === "Crypto";
}

/** Fetch quotes for a set of symbols with caching + graceful fallback. */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols)];
  const now = Date.now();
  const result = new Map<string, Quote>();
  const missEquity: string[] = [];
  const missCrypto: string[] = [];

  for (const symbol of unique) {
    const cached = quoteCache.get(symbol);
    if (cached && cached.expires > now) {
      result.set(symbol, cached.value);
    } else if (isCrypto(symbol)) {
      missCrypto.push(symbol);
    } else {
      missEquity.push(symbol);
    }
  }

  const cryptoPromise: Promise<Map<string, Quote>> =
    missCrypto.length > 0
      ? fetchCryptoQuotes(missCrypto).catch(() => new Map<string, Quote>())
      : Promise.resolve(new Map<string, Quote>());

  const equitySettled = await Promise.allSettled(
    missEquity.map(async (symbol) => {
      const quote = await fetchYahooQuote(symbol);
      return quote;
    }),
  );
  for (const outcome of equitySettled) {
    if (outcome.status !== "fulfilled") continue;
    const quote = outcome.value;
    quoteCache.set(quote.symbol, { value: quote, expires: now + QUOTE_TTL_MS });
    result.set(quote.symbol, quote);
  }

  const cryptoQuotes = await cryptoPromise;
  for (const [symbol, quote] of cryptoQuotes) {
    quoteCache.set(symbol, { value: quote, expires: now + QUOTE_TTL_MS });
    result.set(symbol, quote);
  }

  for (const symbol of unique) {
    if (!result.has(symbol)) result.set(symbol, fallbackQuote(symbol));
  }
  return result;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const quotes = await getQuotes([symbol]);
  return quotes.get(symbol) ?? fallbackQuote(symbol);
}

/** Recent daily closes for sparklines (1 month). */
export async function getSparkline(symbol: string): Promise<number[]> {
  const now = Date.now();
  const cached = sparklineCache.get(symbol);
  if (cached && cached.expires > now) return cached.value;
  try {
    if (isCrypto(symbol)) {
      const id = PRODUCT_MAP.get(symbol)?.coingeckoId;
      const json = (await fetchJson(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`,
      )) as { prices?: [number, number][] };
      const closes = (json.prices ?? []).map(([, p]) => p);
      sparklineCache.set(symbol, { value: closes, expires: now + FX_TTL_MS });
      return closes;
    }
    const json = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
    )) as {
      chart?: { result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const closes = (
      json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    ).filter((c): c is number => typeof c === "number");
    sparklineCache.set(symbol, { value: closes, expires: now + FX_TTL_MS });
    return closes;
  } catch {
    return [];
  }
}

/** USD-based FX rates from Frankfurter (ECB reference rates). */
export async function getFxRates(): Promise<FxRates> {
  const now = Date.now();
  if (fxCache && fxCache.expires > now) return fxCache.value;
  try {
    const json = (await fetchJson(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,JPY,CHF,CAD,AUD,SGD,HKD",
    )) as { base: string; date: string; rates: Record<string, number> };
    const value: FxRates = {
      base: json.base,
      date: json.date,
      rates: json.rates,
      source: "live",
    };
    fxCache = { value, expires: now + FX_TTL_MS };
    return value;
  } catch {
    return {
      base: "USD",
      date: new Date().toISOString().slice(0, 10),
      rates: FALLBACK_FX,
      source: "fallback",
    };
  }
}
