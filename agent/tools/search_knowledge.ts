import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Search the firm's knowledge base (RAG corpus): CIO outlook, advisory fee schedule, approved product shelf, compliance policies (suitability/KYC, client communications), advisor playbooks (concentrated stock, tax-loss harvesting, RMD/QCD, cash deployment), fixed-income desk notes, and client meeting/call records. Returns the most relevant document sections with their source paths. Use this for any question about firm policy, fees, procedures, playbooks, or what was said in past client meetings.",
  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .describe(
        "Keyword search query, e.g. 'wash sale replacement pairs' or 'Marcus Chen exchange fund'",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Max sections to return (default 5)"),
  }),
  async execute({ query, limit }, ctx) {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set("limit", String(limit));
    return await fetchLive(
      `/api/live/knowledge?${params.toString()}`,
      ctx.abortSignal,
    );
  },
});
