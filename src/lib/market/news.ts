import "server-only";

/**
 * Live market headlines from the keyless Yahoo Finance search endpoint
 * (same host as quotes). Results are merged across a few seed queries,
 * deduped and cached briefly; failures degrade to an empty feed.
 */

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** ISO timestamp */
  publishedAt: string;
  relatedTickers: string[];
}

const NEWS_TTL_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_ITEMS = 12;

/** Broad market coverage plus the names that dominate book exposure. */
const SEED_QUERIES = ["^GSPC", "AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "BTC-USD"];

interface YahooNewsItem {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  relatedTickers?: string[];
}

let newsCache: { value: NewsItem[]; expires: number } | null = null;

async function fetchNewsFor(query: string): Promise<YahooNewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=8&quotesCount=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WealthLens/1.0)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`news ${query} → HTTP ${res.status}`);
  const json = (await res.json()) as { news?: YahooNewsItem[] };
  return json.news ?? [];
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (newsCache && newsCache.expires > now) return newsCache.value;

  const settled = await Promise.allSettled(SEED_QUERIES.map(fetchNewsFor));
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const raw of outcome.value) {
      if (!raw.uuid || !raw.title || !raw.link || !raw.providerPublishTime) {
        continue;
      }
      if (seen.has(raw.uuid)) continue;
      seen.add(raw.uuid);
      items.push({
        id: raw.uuid,
        title: raw.title,
        publisher: raw.publisher ?? "Unknown",
        url: raw.link,
        publishedAt: new Date(raw.providerPublishTime * 1000).toISOString(),
        relatedTickers: raw.relatedTickers ?? [],
      });
    }
  }

  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const top = items.slice(0, MAX_ITEMS);

  // Serve stale news rather than an empty feed if every source failed.
  if (top.length === 0 && newsCache) return newsCache.value;
  newsCache = { value: top, expires: now + NEWS_TTL_MS };
  return top;
}

/** Plain-text rendering of the headline feed for AI prompt grounding. */
export function newsText(items: NewsItem[]): string {
  if (items.length === 0) return "No fresh headlines available.";
  return items
    .slice(0, 8)
    .map(
      (n) =>
        `- [${n.publisher}] ${n.title}${n.relatedTickers.length > 0 ? ` (${n.relatedTickers.join(", ")})` : ""}`,
    )
    .join("\n");
}
