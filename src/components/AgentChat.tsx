"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { Markdown } from "./Markdown";

const SUGGESTIONS = [
  "What matters most in my book right now?",
  "Which clients should I call this morning and why?",
  "What does our concentrated-stock playbook say about Marcus Chen's NVDA position?",
  "Draft a check-in email for Sofia Ramirez that follows our comms policy.",
  "Which tax-loss harvest swaps does the firm approve for VEA?",
];

const PIN_THRESHOLD_PX = 48;

/** Human-readable labels for the agent's tools, shown in progress chips. */
const TOOL_LABELS: Record<string, string> = {
  get_live_signals: "Live signals",
  get_market_snapshot: "Market snapshot",
  get_market_news: "Market news",
  get_book_overview: "Book overview",
  get_client_details: "Client details",
  search_knowledge: "Knowledge search",
  read_knowledge_doc: "Reading document",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

function ToolChip({ part }: { part: EveMessagePart }) {
  if (part.type !== "dynamic-tool") return null;
  const done = part.state === "output-available";
  return (
    <span
      className={`mr-1.5 mb-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
        done
          ? "border-edge text-muted"
          : "animate-pulse border-accent/40 bg-accent/10 text-accent"
      }`}
    >
      <span aria-hidden>{done ? "✓" : "⚙"}</span>
      {toolLabel(part.toolName)}
      {!done && "…"}
    </span>
  );
}

function MessageParts({
  message,
  streaming,
}: {
  message: EveMessage;
  streaming: boolean;
}) {
  const toolParts = message.parts.filter((p) => p.type === "dynamic-tool");
  const textParts = message.parts.filter((p) => p.type === "text");
  const text = textParts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  return (
    <>
      {toolParts.length > 0 && (
        <p className="mb-2">
          {toolParts.map((part, i) => (
            <ToolChip key={i} part={part} />
          ))}
        </p>
      )}
      {text ? (
        <div className={streaming ? "stream-caret" : undefined}>
          <Markdown text={text} />
        </div>
      ) : (
        <span
          className="typing-dots inline-flex items-center py-1"
          aria-label="Working"
        >
          <span />
          <span />
          <span />
        </span>
      )}
    </>
  );
}

export function AgentChat({
  clients,
  initialClientId,
}: {
  clients: { id: string; name: string }[];
  initialClientId?: string;
}) {
  const agent = useEveAgent();
  const [input, setInput] = useState("");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [pinned, setPinned] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = agent.status === "submitted" || agent.status === "streaming";
  const messages = agent.data.messages;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setPinned(
      el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX,
    );
  }

  // Follow the stream only while the user is at the bottom; if they scroll
  // up to read something, leave their position alone.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [messages, pinned]);

  // Keep the input ready for the next question.
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setPinned(true);
    const focus = clients.find((c) => c.id === clientId);
    void agent.send({
      message,
      // Ephemeral per-turn context: rides along with the message, is never
      // shown in the transcript and never persisted to session history.
      ...(focus
        ? {
            clientContext: `The RM currently has ${focus.name} (client id: ${focus.id}) focused in the UI. When the question refers to "this client" or is ambiguous, it is about ${focus.name} — use get_client_details with id "${focus.id}".`,
          }
        : {}),
    });
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
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
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => agent.reset()}
            disabled={busy}
            className="ml-auto rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-40"
          >
            New session
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-4 overflow-y-auto rounded-xl border border-edge bg-surface p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <p className="max-w-md text-sm text-muted">
                One durable agent for everything: live market data and
                signals, your book of business, and the firm&apos;s knowledge
                base — policies, playbooks, fees and meeting records.
              </p>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={busy}
                    className="rounded-full border border-edge bg-surface-2 px-3 py-1.5 text-xs text-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, i) => {
            const isLast = i === messages.length - 1;
            const streaming = busy && isLast && message.role === "assistant";
            return (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "animate-rise-in flex justify-end"
                    : "animate-rise-in flex"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm"
                      : "max-w-[95%] rounded-2xl rounded-bl-sm border border-edge bg-surface-2 px-4 py-2.5"
                  }
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">
                      {message.parts
                        .map((p) => (p.type === "text" ? p.text : ""))
                        .join("")}
                    </p>
                  ) : (
                    <MessageParts message={message} streaming={streaming} />
                  )}
                </div>
              </div>
            );
          })}
          {busy && messages.at(-1)?.role === "user" && (
            <div className="animate-rise-in flex">
              <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-edge bg-surface-2 px-4 py-2.5">
                <span
                  className="typing-dots inline-flex items-center py-1"
                  aria-label="Working"
                >
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
        </div>

        {!pinned && messages.length > 0 && (
          <button
            type="button"
            onClick={() => setPinned(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-edge bg-surface-2 px-3 py-1.5 text-xs text-muted shadow-lg transition-colors hover:border-accent/50 hover:text-foreground"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      {agent.error && (
        <p className="animate-rise-in mt-2 text-sm text-negative" role="alert">
          {agent.error.message}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the market, your book, or firm policy…"
          className="flex-1 rounded-xl border border-edge bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => agent.stop()}
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
