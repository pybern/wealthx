import { NextRequest, NextResponse } from "next/server";
import {
  buildBookContext,
  buildClientContext,
  getMarketSnapshot,
  RM_SYSTEM_PROMPT,
} from "@/lib/ai/context";
import {
  streamChat,
  ZenNotConfiguredError,
  type ChatMessage,
} from "@/lib/ai/zen";
import { getClient } from "@/lib/data/clients";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  clientId?: string;
}

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 8_000;

export async function POST(request: NextRequest): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }
  const messages = body.messages.slice(-MAX_MESSAGES);
  for (const m of messages) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
  }

  try {
    const [marketSnapshot, context] = await Promise.all([
      getMarketSnapshot(),
      body.clientId
        ? (async () => {
            const client = getClient(body.clientId as string);
            if (!client) return buildBookContext();
            return buildClientContext(client);
          })()
        : buildBookContext(),
    ]);

    const system: ChatMessage = {
      role: "system",
      content: `${RM_SYSTEM_PROMPT}\n\nLIVE MARKET SNAPSHOT (as of now)\n${marketSnapshot}\n\n${context}`,
    };

    const stream = await streamChat([system, ...messages]);
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
    console.error("AI chat failed:", error);
    return NextResponse.json(
      { error: "The AI request failed. Check server logs and your Open Code Zen configuration." },
      { status: 502 },
    );
  }
}
