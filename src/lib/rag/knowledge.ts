import "server-only";

import { get } from "@vercel/blob";

/**
 * Retrieval layer over the WealthLens knowledge corpus stored in a private
 * Vercel Blob store (seeded from data/rag-corpus/ by `npm run seed:blob`).
 *
 * The corpus is small (a few dozen KB), so the whole thing is loaded into
 * memory, chunked by section, and searched with keyword scoring — no
 * embedding infrastructure required. Results carry the source document path
 * so the agent can cite where an answer came from.
 */

const BLOB_PREFIX = "rag";
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface KnowledgeDocMeta {
  path: string;
  title: string;
  category: string;
  bytes: number;
}

export interface KnowledgeDoc extends KnowledgeDocMeta {
  content: string;
}

export interface KnowledgeChunk {
  /** Document path within the corpus, e.g. "playbooks/concentrated-stock-playbook.md" */
  path: string;
  title: string;
  category: string;
  /** Section heading the chunk came from ("" for the document preamble). */
  heading: string;
  text: string;
}

export interface KnowledgeSearchHit extends KnowledgeChunk {
  score: number;
}

interface Manifest {
  generatedAt: string;
  documents: { path: string; title: string; category: string; bytes: number }[];
}

interface CorpusCache {
  loadedAt: number;
  docs: KnowledgeDoc[];
  chunks: KnowledgeChunk[];
}

export function isKnowledgeConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export class KnowledgeNotConfiguredError extends Error {
  constructor() {
    super(
      "The knowledge base is not configured. Set BLOB_READ_WRITE_TOKEN and seed the store with `npm run seed:blob`.",
    );
    this.name = "KnowledgeNotConfiguredError";
  }
}

async function readBlobText(pathname: string): Promise<string> {
  const result = await get(`${BLOB_PREFIX}/${pathname}`, { access: "private" });
  if (!result) throw new Error(`Knowledge blob not found: ${pathname}`);
  return await new Response(result.stream).text();
}

function chunkDocument(doc: KnowledgeDoc): KnowledgeChunk[] {
  // Split on H2 sections; the part before the first "## " is the preamble.
  const sections = doc.content.split(/\n(?=## )/);
  return sections
    .map((section) => {
      const headingMatch = section.match(/^## (.+)$/m);
      return {
        path: doc.path,
        title: doc.title,
        category: doc.category,
        heading: headingMatch?.[1]?.trim() ?? "",
        text: section.trim(),
      };
    })
    .filter((chunk) => chunk.text.length > 0);
}

let cache: CorpusCache | null = null;
let inflight: Promise<CorpusCache> | null = null;

async function loadCorpus(): Promise<CorpusCache> {
  if (!isKnowledgeConfigured()) throw new KnowledgeNotConfiguredError();
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const manifest = JSON.parse(await readBlobText("manifest.json")) as Manifest;
      const docs = await Promise.all(
        manifest.documents.map(async (meta): Promise<KnowledgeDoc> => {
          const content = await readBlobText(meta.path);
          return {
            path: meta.path,
            title: meta.title,
            category: meta.category,
            bytes: meta.bytes,
            content,
          };
        }),
      );
      cache = {
        loadedAt: Date.now(),
        docs,
        chunks: docs.flatMap(chunkDocument),
      };
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does",
  "for", "from", "has", "have", "how", "i", "in", "is", "it", "its", "my",
  "of", "on", "or", "our", "should", "that", "the", "their", "this", "to",
  "under", "was", "we", "what", "when", "where", "which", "who", "why",
  "will", "with", "you", "your",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function countOccurrences(haystack: string, term: string): number {
  let count = 0;
  let idx = haystack.indexOf(term);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(term, idx + term.length);
  }
  return count;
}

function scoreChunk(chunk: KnowledgeChunk, terms: string[]): number {
  const text = chunk.text.toLowerCase();
  const heading = chunk.heading.toLowerCase();
  const title = chunk.title.toLowerCase();
  let score = 0;
  let matchedTerms = 0;
  for (const term of terms) {
    const inText = countOccurrences(text, term);
    const inHeading = heading.includes(term) ? 1 : 0;
    const inTitle = title.includes(term) ? 1 : 0;
    if (inText + inHeading + inTitle > 0) matchedTerms += 1;
    // Diminishing returns on repeats; headings and titles weigh more.
    score += Math.min(inText, 5) + inHeading * 3 + inTitle * 2;
  }
  if (matchedTerms === 0) return 0;
  // Reward chunks matching more distinct query terms.
  return score * (1 + (matchedTerms - 1) * 0.5);
}

export async function listKnowledgeDocs(): Promise<KnowledgeDocMeta[]> {
  const { docs } = await loadCorpus();
  return docs.map(({ path, title, category, bytes }) => ({
    path,
    title,
    category,
    bytes,
  }));
}

export async function getKnowledgeDoc(
  path: string,
): Promise<KnowledgeDoc | null> {
  const { docs } = await loadCorpus();
  return docs.find((d) => d.path === path) ?? null;
}

const MAX_CHUNK_CHARS = 1600;

export async function searchKnowledge(
  query: string,
  limit = 5,
): Promise<KnowledgeSearchHit[]> {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  const { chunks } = await loadCorpus();
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk, score }) => ({
      ...chunk,
      text:
        chunk.text.length > MAX_CHUNK_CHARS
          ? `${chunk.text.slice(0, MAX_CHUNK_CHARS)}…`
          : chunk.text,
      score: Math.round(score * 10) / 10,
    }));
}
