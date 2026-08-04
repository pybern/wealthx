"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { Markdown } from "./Markdown";

const SUGGESTIONS = [
  "What matters most in my book right now?",
  "Scan the live signals and flag the top risks.",
  "What's the news behind today's biggest movers?",
  "Which clients should I call this morning and why?",
];

const PIN_THRESHOLD_PX = 48;

function ToolChip({ part }: { part: EveMessagePart }) {
  if (part.type !== "dynamic-tool") return null;
  const done = part.state === "output-available";
  return (
    <span
      className={`mr-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
        done
          ? "border-edge text-muted"
          : "border-accent/40 bg-accent/10 text-accent"
      }`}
    >
      <span aria-hidden>{done ? "✓" : "⚙"}</span>
      {part.toolName}
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

export function InsightsAgent() {
  const agent = useEveAgent();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = agent.status === "submitted" || agent.status === "streaming";
  const messages = agent.data.messages;

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

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    pinnedRef.current = true;
    void agent.send({ message });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-edge bg-surface p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">
              A durable eve agent with live tools: market snapshot, derived
              signals, headlines and your book. Ask for an insight and watch
              it gather the data.
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
          const streaming =
            busy && isLast && message.role === "assistant";
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
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm"
                    : "max-w-[92%] rounded-2xl rounded-bl-sm border border-edge bg-surface-2 px-4 py-2.5"
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
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-edge bg-surface-2 px-4 py-2.5">
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a live insight…"
          className="flex-1 rounded-xl border border-edge bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        {messages.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => agent.reset()}
            className="rounded-xl border border-edge bg-surface-2 px-4 py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            New session
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
