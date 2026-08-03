"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(text, { async: false, breaks: true });
    return DOMPurify.sanitize(raw);
  }, [text]);
  return (
    <div className="ai-prose" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
