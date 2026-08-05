/**
 * Seeds the Vercel Blob store with the WealthLens RAG knowledge corpus.
 *
 * Uploads every markdown document under data/rag-corpus/ to the store under
 * the `rag/` prefix (stable pathnames, overwrite on re-run) and writes a
 * `rag/manifest.json` index describing each document, so a retrieval
 * pipeline can discover the corpus with a single fetch.
 *
 * The store is private: documents are read back server-side with
 * `get()`/`list()` from @vercel/blob using the same token.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> npm run seed:blob
 */
import { list, put } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CORPUS_DIR = path.join(import.meta.dirname, "..", "data", "rag-corpus");
const BLOB_PREFIX = "rag";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Aborting.");
  process.exit(1);
}

const files = (await readdir(CORPUS_DIR, { recursive: true }))
  .filter((f) => f.endsWith(".md"))
  .sort();

if (files.length === 0) {
  console.error(`No markdown documents found under ${CORPUS_DIR}. Aborting.`);
  process.exit(1);
}

console.log(`Seeding ${files.length} documents from ${CORPUS_DIR}\n`);

const manifest = [];

for (const file of files) {
  const relPath = file.split(path.sep).join("/");
  const content = await readFile(path.join(CORPUS_DIR, file), "utf8");
  const title = content.match(/^#\s+(.+)$/m)?.[1] ?? relPath;
  const category = relPath.split("/")[0];

  const blob = await put(`${BLOB_PREFIX}/${relPath}`, content, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/markdown; charset=utf-8",
  });

  manifest.push({
    path: relPath,
    pathname: blob.pathname,
    url: blob.url,
    title,
    category,
    bytes: Buffer.byteLength(content, "utf8"),
  });
  console.log(`  uploaded ${blob.pathname}  (${title})`);
}

const manifestBlob = await put(
  `${BLOB_PREFIX}/manifest.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), documents: manifest }, null, 2),
  {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  },
);
console.log(`\n  uploaded ${manifestBlob.pathname}`);

const { blobs } = await list({ prefix: `${BLOB_PREFIX}/` });
console.log(`\nStore now holds ${blobs.length} blobs under "${BLOB_PREFIX}/":`);
for (const b of blobs) {
  console.log(`  ${String(b.size).padStart(7)} B  ${b.pathname}`);
}
console.log(`\nManifest URL: ${manifestBlob.url}`);
