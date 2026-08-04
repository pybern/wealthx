import { CLIENTS } from "@/lib/data/clients";
import { isZenConfigured } from "@/lib/ai/zen";
import { CopilotChat } from "@/components/CopilotChat";

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const configured = isZenConfigured();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI Copilot</h1>
          <p className="mt-1 text-sm text-muted">
            Grounded in live market data and your book of business. Powered by
            Open Code Zen.
          </p>
        </div>
        {!configured && <p className="text-xs text-muted">Not configured</p>}
      </header>
      <div className="min-h-0 flex-1">
        <CopilotChat
          clients={CLIENTS.map((c) => ({ id: c.id, name: c.name }))}
          configured={configured}
          initialClientId={client}
        />
      </div>
    </div>
  );
}
