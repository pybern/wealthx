import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Get the live market snapshot: current levels and day changes for major indices (S&P 500, Nasdaq, Dow, Russell 2000), the VIX, the US 10-year Treasury yield, gold and WTI crude.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await fetchLive("/api/live/market", ctx.abortSignal);
  },
});
