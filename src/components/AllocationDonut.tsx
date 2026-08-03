import type { PortfolioSummary } from "@/lib/types";
import { ASSET_CLASS_COLORS } from "./ui";
import { fmtCompact } from "@/lib/portfolio";

/** Pure-SVG donut chart of asset allocation. Server component. */
export function AllocationDonut({
  allocation,
  size = 168,
}: {
  allocation: PortfolioSummary["allocation"];
  size?: number;
}) {
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices = allocation.reduce<
    { assetClass: string; length: number; offset: number }[]
  >((acc, slice) => {
    const prev = acc[acc.length - 1];
    acc.push({
      assetClass: slice.assetClass,
      length: (slice.pct / 100) * circumference,
      offset: prev ? prev.offset + prev.length : 0,
    });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Asset allocation"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice) => (
            <circle
              key={slice.assetClass}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ASSET_CLASS_COLORS[slice.assetClass] ?? "#64748b"}
              strokeWidth={stroke}
              strokeDasharray={`${slice.length} ${circumference - slice.length}`}
              strokeDashoffset={-slice.offset}
            />
          ))}
        </g>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {allocation.map((slice) => (
          <li key={slice.assetClass} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor:
                  ASSET_CLASS_COLORS[slice.assetClass] ?? "#64748b",
              }}
            />
            <span className="text-muted">{slice.assetClass}</span>
            <span className="ml-auto pl-4 tabular-nums">
              {slice.pct.toFixed(1)}%
            </span>
            <span className="w-20 text-right tabular-nums text-muted">
              {fmtCompact(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
