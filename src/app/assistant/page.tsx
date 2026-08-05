import { CLIENTS } from "@/lib/data/clients";
import { AgentChat } from "@/components/AgentChat";

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Copilot</h1>
          <p className="mt-1 text-sm text-muted">
            One durable agent grounded in live market data, your book, and the
            firm&apos;s knowledge base. Powered by eve + Open Code Zen.
          </p>
        </div>
        <p className="text-xs text-muted">Powered by eve</p>
      </header>
      <div className="min-h-0 flex-1">
        <AgentChat
          clients={CLIENTS.map((c) => ({ id: c.id, name: c.name }))}
          initialClientId={client}
        />
      </div>
    </div>
  );
}
