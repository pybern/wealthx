"use client";

import type { ReactNode } from "react";
import { useFlashOnChange } from "./useFlashOnChange";

/** Briefly highlights a quote container when its value changes on refresh. */
export function QuoteFlash({
  id,
  fingerprint,
  children,
  className = "",
}: {
  id: string;
  fingerprint: string;
  children: ReactNode;
  className?: string;
}) {
  const changed = useFlashOnChange([{ id, fingerprint }]).has(id);
  return (
    <div
      className={`rounded-lg transition-colors ${
        changed ? "quote-flash" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
