/**
 * Curated Open Code Zen models exposed in the copilot model selector.
 * Shared between server (API validation) and client (selector UI), so this
 * module must stay importable from both — no "server-only" here.
 *
 * The list favors fast, low-latency models; heavier flagships are included
 * for when quality matters more than speed. Ids must exist in the Zen
 * catalog (https://opencode.ai/zen/v1/models).
 */

export interface AiModel {
  id: string;
  label: string;
  /** Fast, low-latency tier — preferred for interactive use. */
  fast: boolean;
}

export const AI_MODELS: AiModel[] = [
  { id: "gpt-5.6-luna", label: "GPT 5.6 Luna", fast: true },
  { id: "gpt-5.6-terra", label: "GPT 5.6 Terra", fast: true },
  { id: "gpt-5.6-sol", label: "GPT 5.6 Sol", fast: false },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", fast: true },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", fast: false },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", fast: true },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", fast: true },
];

/** GPT 5.6 by default; Luna is the fast 5.6 variant. */
export const DEFAULT_MODEL_ID = "gpt-5.6-luna";

export function isSupportedModel(id: unknown): id is string {
  return (
    typeof id === "string" && AI_MODELS.some((model) => model.id === id)
  );
}
