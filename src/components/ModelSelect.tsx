"use client";

import { AI_MODELS } from "@/lib/ai/models";

export function ModelSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-50"
    >
      {AI_MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
          {m.fast ? " · fast" : ""}
        </option>
      ))}
    </select>
  );
}
