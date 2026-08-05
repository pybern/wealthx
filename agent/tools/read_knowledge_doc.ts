import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Read one full document from the firm's knowledge base by its corpus path (as returned by search_knowledge, e.g. 'playbooks/concentrated-stock-playbook.md'). Use when search snippets are not enough and you need the complete policy, playbook, or meeting record.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        "Corpus document path from search_knowledge results, e.g. 'compliance/suitability-and-kyc-policy.md'",
      ),
  }),
  async execute({ path }, ctx) {
    return await fetchLive(
      `/api/live/knowledge?path=${encodeURIComponent(path)}`,
      ctx.abortSignal,
    );
  },
});
