import { NextRequest, NextResponse } from "next/server";
import {
  getKnowledgeDoc,
  KnowledgeNotConfiguredError,
  listKnowledgeDocs,
  searchKnowledge,
} from "@/lib/rag/knowledge";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 500;
const MAX_LIMIT = 10;

/**
 * Knowledge-base retrieval over the seeded Vercel Blob corpus.
 *
 * - `?q=<query>[&limit=n]` — keyword search, returns scored section chunks
 * - `?path=<doc path>`     — full document by corpus path
 * - no params              — corpus listing (manifest)
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const path = searchParams.get("path");

  try {
    if (q !== null) {
      if (q.length === 0 || q.length > MAX_QUERY_LENGTH) {
        return NextResponse.json({ error: "Invalid query" }, { status: 400 });
      }
      const rawLimit = Number(searchParams.get("limit") ?? 5);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
        : 5;
      const results = await searchKnowledge(q, limit);
      return NextResponse.json(
        { query: q, results },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (path !== null) {
      const doc = await getKnowledgeDoc(path);
      if (!doc) {
        return NextResponse.json(
          { error: `Unknown document path: ${path}` },
          { status: 404 },
        );
      }
      return NextResponse.json(doc, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const documents = await listKnowledgeDocs();
    return NextResponse.json(
      { documents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof KnowledgeNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Knowledge base request failed:", error);
    return NextResponse.json(
      { error: "Knowledge base request failed" },
      { status: 502 },
    );
  }
}
