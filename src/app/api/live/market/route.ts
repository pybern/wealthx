import { NextResponse } from "next/server";
import { MARKET_INDICES } from "@/lib/data/products";
import { getQuotes } from "@/lib/market/quotes";

export const dynamic = "force-dynamic";

/** Live snapshot of indices, rates and commodities. */
export async function GET(): Promise<Response> {
  const quotes = await getQuotes(MARKET_INDICES.map((i) => i.symbol));
  return NextResponse.json(
    {
      asOf: new Date().toISOString(),
      quotes: MARKET_INDICES.map(({ symbol, label }) => {
        const q = quotes.get(symbol);
        if (!q) return null;
        return {
          symbol,
          label,
          price: q.price,
          changePct: q.changePct,
          dayHigh: q.dayHigh ?? null,
          dayLow: q.dayLow ?? null,
          source: q.source,
        };
      }).filter(Boolean),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
