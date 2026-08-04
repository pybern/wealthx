import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

/**
 * Routes the agent's model through the Open Code Zen gateway — the same
 * OpenAI-compatible gateway and credential the rest of WealthLens uses —
 * instead of the Vercel AI Gateway default.
 */
const zen = createOpenAICompatible({
  name: "opencode-zen",
  baseURL: process.env.OPENCODE_ZEN_BASE_URL ?? "https://opencode.ai/zen/v1",
  apiKey: process.env.OPENCODE_ZEN_API_KEY ?? process.env.OPENCODE_API_KEY,
});

export default defineAgent({
  // GPT 5.6 Luna: the fast 5.6 tier, consistent with the app's default.
  model: zen(process.env.EVE_INSIGHTS_MODEL ?? "gpt-5.6-luna"),
  // Required for non-gateway models: eve cannot look up the context
  // window for a custom provider id. GPT 5.6 supports 272k input tokens.
  modelContextWindowTokens: 272_000,
});
