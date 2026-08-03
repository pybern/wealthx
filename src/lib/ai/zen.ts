import "server-only";
import { DEFAULT_MODEL_ID } from "./models";

/**
 * Open Code Zen — OpenAI-compatible LLM gateway.
 * https://opencode.ai/docs/zen/
 *
 * Configure via environment variables (see .env.example):
 *   OPENCODE_ZEN_API_KEY   – API key from opencode.ai/auth
 *   OPENCODE_ZEN_MODEL     – fallback model id when a request doesn't
 *                            specify one (default: GPT 5.6 Luna)
 *   OPENCODE_ZEN_BASE_URL  – override the gateway URL if needed
 */

const DEFAULT_BASE_URL = "https://opencode.ai/zen/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getZenConfig(): {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
} {
  return {
    apiKey:
      process.env.OPENCODE_ZEN_API_KEY ?? process.env.OPENCODE_API_KEY,
    baseUrl: process.env.OPENCODE_ZEN_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.OPENCODE_ZEN_MODEL ?? DEFAULT_MODEL_ID,
  };
}

export function isZenConfigured(): boolean {
  return Boolean(getZenConfig().apiKey);
}

export class ZenNotConfiguredError extends Error {
  constructor() {
    super(
      "Open Code Zen is not configured. Set OPENCODE_ZEN_API_KEY in .env.local (get a key at opencode.ai/auth).",
    );
    this.name = "ZenNotConfiguredError";
  }
}

/**
 * Stream a chat completion from Open Code Zen. Returns a stream of plain
 * text chunks (SSE deltas already parsed).
 */
export async function streamChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, baseUrl, model: fallbackModel } = getZenConfig();
  if (!apiKey) throw new ZenNotConfiguredError();
  const model = options?.model ?? fallbackModel;

  // Only send temperature when explicitly requested — newer models
  // (e.g. Claude Sonnet 5) reject the parameter as deprecated.
  const doFetch = () =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(options?.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

  // The gateway intermittently returns HTTP 500 for otherwise-working
  // models; nothing has streamed yet at this point, so one retry is safe.
  let response = await doFetch();
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    response = await doFetch();
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Open Code Zen request failed (HTTP ${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    // Keep reading until at least one chunk is enqueued (or the upstream
    // ends). Some models (e.g. the GPT 5.6 family) lead with many
    // contentless keep-alive chunks; if pull() resolves without enqueuing,
    // the stream stops being pulled and the response stalls forever.
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let enqueued = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
              enqueued = true;
            }
          } catch {
            // Ignore malformed keep-alive lines
          }
        }
        if (enqueued) return;
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}
