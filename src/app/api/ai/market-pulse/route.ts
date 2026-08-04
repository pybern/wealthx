import { NextRequest, NextResponse } from "next/server";
import {
  buildBookContext,
  getMarketSnapshot,
  RM_SYSTEM_PROMPT,
} from "@/lib/ai/context";
import { isSupportedModel } from "@/lib/ai/models";
import { streamChat, ZenNotConfiguredError } from "@/lib/ai/zen";
import { getMarketNews, newsText } from "@/lib/market/news";
import { buildMarketSignals, signalsText } from "@/lib/market/signals";

export const runtime = "nodejs";
export const maxDuration = 60;

interface MarketPulseRequestBody {
  model?: string;
}

const PULSE_PROMPT = `Write a "market pulse" briefing for the RM based on the live data above. Structure:
1. **What's moving** — 2-4 bullets on the most notable index, rate, commodity and volatility action right now. Weave in the one or two most relevant headlines where they explain a move.
2. **What it means for your book** — connect today's moves, the live signals and any relevant headlines to actual book exposure (name clients or positions only where the data supports it).
3. **Suggested actions** — 2-3 concrete, prioritized steps for today (outreach, rebalancing conversations, harvesting, deploying cash).
Keep it under 250 words, grounded strictly in the data provided. This is a point-in-time read, not investment advice.`;

export async function POST(request: NextRequest): Promise<Response> {
  let body: MarketPulseRequestBody = {};
  try {
    const raw = (await request.json()) as unknown;
    if (raw && typeof raw === "object") body = raw as MarketPulseRequestBody;
  } catch {
    // Empty body is fine — all fields are optional.
  }

  if (body.model !== undefined && !isSupportedModel(body.model)) {
    return NextResponse.json({ error: "Unsupported model" }, { status: 400 });
  }

  try {
    const [marketSnapshot, signals, news, bookContext] = await Promise.all([
      getMarketSnapshot(),
      buildMarketSignals(),
      getMarketNews(),
      buildBookContext(),
    ]);

    const stream = await streamChat(
      [
        {
          role: "system",
          content: `${RM_SYSTEM_PROMPT}\n\nLIVE MARKET SNAPSHOT (as of now)\n${marketSnapshot}\n\nLIVE MARKET SIGNALS\n${signalsText(signals)}\n\nLATEST MARKET HEADLINES\n${newsText(news)}\n\n${bookContext}`,
        },
        { role: "user", content: PULSE_PROMPT },
      ],
      { model: body.model },
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ZenNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("AI market pulse failed:", error);
    return NextResponse.json(
      { error: "The AI request failed. Check server logs and your Open Code Zen configuration." },
      { status: 502 },
    );
  }
}
