"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { Markdown } from "./Markdown";
import { ModelSelect } from "./ModelSelect";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Which clients need attention this week and why?",
  "Summarize how my book is positioned for today's market.",
  "Who has excess cash I should talk to about deploying?",
  "Which portfolios have drifted furthest from target?",
];

/** Consider the user "pinned" to the bottom within this many pixels. */
const PIN_THRESHOLD_PX = 48;

export function CopilotChat({
  clients,
  configured,
  initialClientId,
}: {
  clients: { id: string; name: string }[];
  configured: boolean;
  initialClientId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the stream only while the user is at the bottom; if they scroll
  // up to read something, leave their position alone.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function stop() {
    abortRef.current?.abort();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    pinnedRef.current = true;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: next,
          clientId: clientId || undefined,
          model,
        }),
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
        const current = acc;
        setMessages([...next, { role: "assistant", content: current }]);
      }
      if (!acc) {
        setMessages([
          ...next,
          { role: "assistant", content: "_(empty response)_" },
        ]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stopped by the user — keep whatever streamed so far.
        setMessages(
          acc ? [...next, { role: "assistant", content: acc }] : next,
        );
      } else {
        setMessages(next);
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label htmlFor="focus-client" className="text-xs text-muted">
          Context
        </label>
        <select
          id="focus-client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        >
          <option value="">Entire book of business</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="copilot-model" className="ml-2 text-xs text-muted">
          Model
        </label>
        <ModelSelect id="copilot-model" value={model} onChange={setModel} />
      </div>

      {!configured && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <p className="font-medium">Open Code Zen is not configured yet.</p>
          <p className="mt-1 text-amber-300/80">
            Add <code className="font-mono">OPENCODE_ZEN_API_KEY</code> to{" "}
            <code className="font-mono">.env.local</code> (key from{" "}
            opencode.ai/auth) and restart the dev server to enable the
            copilot.
          </p>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth rounded-xl border border-edge bg-surface p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">
              Ask anything about your book, a client, or the market. Answers
              are grounded in live prices and portfolio data.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="rounded-full border border-edge bg-surface-2 px-3 py-1.5 text-xs text-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isStreaming =
            busy && i === messages.length - 1 && m.role === "assistant";
          return (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "animate-rise-in flex justify-end"
                  : "animate-rise-in flex"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm"
                    : "max-w-[92%] rounded-2xl rounded-bl-sm border border-edge bg-surface-2 px-4 py-2.5"
                }
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : m.content ? (
                  <div className={isStreaming ? "stream-caret" : undefined}>
                    <Markdown text={m.content} />
                  </div>
                ) : (
                  <span
                    className="typing-dots inline-flex items-center py-1"
                    aria-label="Thinking"
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="animate-rise-in mt-2 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the copilot…"
          className="flex-1 rounded-xl border border-edge bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-xl border border-edge bg-surface-2 px-5 py-2.5 text-sm font-medium transition-colors hover:border-negative/60 hover:text-negative"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
