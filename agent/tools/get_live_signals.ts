import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Get the current derived market signals: notable index/rate/commodity moves, volatility regime, big movers among held positions (with book exposure in dollars and client count), 52-week-range proximity and crypto swings. The fastest read on what matters right now.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await fetchLive("/api/live/signals", ctx.abortSignal);
  },
});
