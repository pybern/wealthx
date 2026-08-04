import { NextResponse } from "next/server";
import { buildMarketSignals } from "@/lib/market/signals";

export const dynamic = "force-dynamic";

/** Derived live market signals with book exposure. */
export async function GET(): Promise<Response> {
  const result = await buildMarketSignals();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
