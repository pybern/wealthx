import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Get the latest live market headlines with publisher, publish time and related tickers. Use to explain why something is moving or to brief the RM on client-relevant stories.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await fetchLive("/api/live/news", ctx.abortSignal);
  },
});
