import { InsightsAgent } from "@/components/InsightsAgent";

export const dynamic = "force-dynamic";

export default function InsightsPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Insights</h1>
          <p className="mt-1 text-sm text-muted">
            A durable eve agent that pulls live signals, market data,
            headlines and your book on demand.
          </p>
        </div>
        <p className="text-xs text-muted">Powered by eve</p>
      </header>
      <div className="min-h-0 flex-1">
        <InsightsAgent />
      </div>
    </div>
  );
}
