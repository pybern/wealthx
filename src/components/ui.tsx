import type { ReactNode } from "react";
import type { InsightSeverity } from "@/lib/types";
import { fmtPct } from "@/lib/portfolio";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-edge bg-surface p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    subTone === "positive"
      ? "text-accent"
      : subTone === "negative"
        ? "text-negative"
        : "text-muted";
  return (
    <div className="rounded-xl border border-edge bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-sm tabular-nums ${toneClass}`}>{sub}</p>}
    </div>
  );
}

export function ChangePct({
  value,
  digits = 2,
}: {
  value: number;
  digits?: number;
}) {
  const tone = value > 0.0001 ? "text-accent" : value < -0.0001 ? "text-negative" : "text-muted";
  return (
    <span className={`tabular-nums ${tone}`}>{fmtPct(value, digits)}</span>
  );
}

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  action: "bg-red-500/10 text-red-400 border-red-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  action: "Action",
  warning: "Watch",
  info: "Info",
};

export function SeverityBadge({ severity }: { severity: InsightSeverity }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLES[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-edge bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}

export const ASSET_CLASS_COLORS: Record<string, string> = {
  "US Equity": "#34d399",
  "International Equity": "#38bdf8",
  "Fixed Income": "#a78bfa",
  "Real Assets": "#eab308",
  Crypto: "#f97316",
  Cash: "#64748b",
};
