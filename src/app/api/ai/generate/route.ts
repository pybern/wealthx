import { NextRequest, NextResponse } from "next/server";
import {
  buildClientContext,
  getMarketSnapshot,
  RM_SYSTEM_PROMPT,
  TASK_PROMPTS,
  type AiTask,
} from "@/lib/ai/context";
import { isSupportedModel } from "@/lib/ai/models";
import { streamChat, ZenNotConfiguredError } from "@/lib/ai/zen";
import { getClient } from "@/lib/data/clients";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GenerateRequestBody {
  clientId: string;
  task: AiTask;
  model?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const taskPrompt = TASK_PROMPTS[body.task];
  if (!taskPrompt) {
    return NextResponse.json(
      { error: `Unknown task. Expected one of: ${Object.keys(TASK_PROMPTS).join(", ")}` },
      { status: 400 },
    );
  }
  const client = getClient(body.clientId);
  if (!client) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }
  if (body.model !== undefined && !isSupportedModel(body.model)) {
    return NextResponse.json({ error: "Unsupported model" }, { status: 400 });
  }

  try {
    const [marketSnapshot, context] = await Promise.all([
      getMarketSnapshot(),
      buildClientContext(client),
    ]);

    const stream = await streamChat(
      [
        {
          role: "system",
          content: `${RM_SYSTEM_PROMPT}\n\nLIVE MARKET SNAPSHOT (as of now)\n${marketSnapshot}\n\n${context}`,
        },
        { role: "user", content: taskPrompt },
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
    console.error("AI generate failed:", error);
    return NextResponse.json(
      { error: "The AI request failed. Check server logs and your Open Code Zen configuration." },
      { status: 502 },
    );
  }
}
