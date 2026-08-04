import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Get the live-priced book-of-business overview: every client household with segment, risk profile, AUM, today's move, cash and next review date, plus the client id directory for follow-up lookups.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await fetchLive("/api/live/book", ctx.abortSignal);
  },
});
