"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { Markdown } from "./Markdown";
import { ModelSelect } from "./ModelSelect";

export function MarketPulse({ configured }: { configured: boolean }) {
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function stop() {
    abortRef.current?.abort();
  }

  async function generate() {
    if (busy) return;
    setOutput("");
    setError(null);
    setGeneratedAt(null);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch("/api/ai/market-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model }),
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
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
      setGeneratedAt(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setOutput(acc);
      } else {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <p className="text-sm text-muted">
        Set <code className="font-mono">OPENCODE_ZEN_API_KEY</code> in{" "}
        <code className="font-mono">.env.local</code> to enable the AI market
        pulse.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted">
          A grounded read of what&apos;s moving right now and what it means
          for your book.
        </p>
        <ModelSelect
          id="pulse-model"
          value={model}
          onChange={setModel}
          disabled={busy}
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-edge bg-surface-2 px-4 py-1.5 text-sm font-medium transition-colors hover:border-negative/60 hover:text-negative"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void generate()}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            {output ? "Regenerate" : "Generate pulse"}
          </button>
        )}
      </div>
      {error && (
        <p className="animate-rise-in mt-3 text-sm text-negative" role="alert">
          {error}
        </p>
      )}
      {(output || busy) && (
        <div className="animate-rise-in mt-4 rounded-xl border border-edge bg-surface-2 p-5">
          {output ? (
            <div className={busy ? "stream-caret" : undefined}>
              <Markdown text={output} />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="typing-dots inline-flex items-center" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              Reading live market data and your book…
            </p>
          )}
          {generatedAt && !busy && (
            <p className="mt-3 border-t border-edge pt-3 text-xs text-muted">
              Generated at {generatedAt} from live market data. Regenerates
              fresh on demand as quotes update.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
