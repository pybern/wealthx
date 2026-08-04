import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/market/news";

export const dynamic = "force-dynamic";

/** Latest market headlines. */
export async function GET(): Promise<Response> {
  const items = await getMarketNews();
  return NextResponse.json(
    { asOf: new Date().toISOString(), items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
