interface SourceStatus {
  name: string;
  detail: string;
  state: "live" | "stale" | "fallback";
}

const STYLES: Record<SourceStatus["state"], string> = {
  live: "border-accent/30 bg-accent/5 text-accent",
  stale: "border-gold/30 bg-gold/5 text-gold",
  fallback: "border-negative/30 bg-negative/5 text-negative",
};

export function DataSourceHealth({
  sources,
}: {
  sources: SourceStatus[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {sources.map((source) => (
        <div
          key={source.name}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${STYLES[source.state]}`}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              source.state === "live"
                ? "live-status-dot bg-accent"
                : source.state === "stale"
                  ? "bg-gold"
                  : "bg-negative"
            }`}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium">{source.name}</p>
            <p className="truncate text-[10px] text-muted">{source.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
