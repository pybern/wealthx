"use client";

import { useState } from "react";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { Markdown } from "./Markdown";
import { ModelSelect } from "./ModelSelect";

type Task = "brief" | "email" | "commentary" | "actions";

const TASKS: { id: Task; label: string; description: string }[] = [
  { id: "brief", label: "Meeting brief", description: "Pre-meeting prep with talking points" },
  { id: "actions", label: "Next best actions", description: "Prioritized to-do list for this client" },
  { id: "email", label: "Draft email", description: "Personalized check-in email" },
  { id: "commentary", label: "Portfolio commentary", description: "Quarterly-letter narrative" },
];

export function AiWorkbench({
  clientId,
  configured,
}: {
  clientId: string;
  configured: boolean;
}) {
  const [active, setActive] = useState<Task | null>(null);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);

  async function run(task: Task) {
    if (busy) return;
    setActive(task);
    setOutput("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, task, model }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!configured && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Set <code className="font-mono">OPENCODE_ZEN_API_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to enable AI
          generation.
        </div>
      )}
      <div className="mb-3 flex items-center gap-3">
        <label htmlFor="workbench-model" className="text-xs text-muted">
          Model
        </label>
        <ModelSelect
          id="workbench-model"
          value={model}
          onChange={setModel}
          disabled={busy}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TASKS.map((task) => (
          <button
            key={task.id}
            onClick={() => void run(task.id)}
            disabled={busy}
            className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
              active === task.id
                ? "border-accent/60 bg-accent/10"
                : "border-edge bg-surface-2 hover:border-accent/40"
            }`}
          >
            <p className="text-sm font-medium">
              {busy && active === task.id ? "Generating…" : task.label}
            </p>
            <p className="mt-0.5 text-xs text-muted">{task.description}</p>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-negative" role="alert">
          {error}
        </p>
      )}
      {(output || (busy && active)) && (
        <div className="mt-4 rounded-xl border border-edge bg-surface-2 p-5">
          {output ? (
            <Markdown text={output} />
          ) : (
            <p className="animate-pulse text-sm text-muted">
              Gathering live portfolio data and generating…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
