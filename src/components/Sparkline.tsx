"use client";

import { useFlashOnChange } from "./useFlashOnChange";

/** Tiny SVG sparkline whose last point pulses when the series updates. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const fingerprint = values.join(",");
  const changed = useFlashOnChange([{ id: "series", fingerprint }]).has(
    "series",
  );
  if (values.length < 2) {
    return <div style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  const color = up ? "#34d399" : "#f87171";
  const lastPoint = points.split(" ").at(-1)?.split(",").map(Number);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`${up ? "Rising" : "Falling"} price trend`}
      role="img"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {lastPoint && (
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="2.25"
          fill={color}
          className={changed ? "spark-endpoint" : undefined}
        />
      )}
    </svg>
  );
}
