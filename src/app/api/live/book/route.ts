import { NextResponse } from "next/server";
import { buildBookContext } from "@/lib/ai/context";
import { CLIENTS } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

/** Live-priced book-of-business overview plus the client directory. */
export async function GET(): Promise<Response> {
  const overview = await buildBookContext();
  return NextResponse.json(
    {
      asOf: new Date().toISOString(),
      overview,
      clients: CLIENTS.map((c) => ({ id: c.id, name: c.name })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
