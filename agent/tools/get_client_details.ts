import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchLive } from "../lib/wealthlens";

export default defineTool({
  description:
    "Get one client's full live-priced context: profile, portfolio holdings with live prices, asset allocation and drift vs target, goals, advisor notes, recent activity and open alerts. Use get_book_overview first to find the client id.",
  inputSchema: z.object({
    clientId: z
      .string()
      .min(1)
      .describe("Client id from the book overview, e.g. 'sofia-ramirez'"),
  }),
  async execute({ clientId }, ctx) {
    return await fetchLive(
      `/api/live/client/${encodeURIComponent(clientId)}`,
      ctx.abortSignal,
    );
  },
});
