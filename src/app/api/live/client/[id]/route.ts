import { NextRequest, NextResponse } from "next/server";
import { buildClientContext } from "@/lib/ai/context";
import { getClient } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

/** Full live-priced context for one client. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const client = getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }
  const context = await buildClientContext(client);
  return NextResponse.json(
    { asOf: new Date().toISOString(), context },
    { headers: { "Cache-Control": "no-store" } },
  );
}
