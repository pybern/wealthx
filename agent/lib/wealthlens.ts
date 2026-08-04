/**
 * Fetch helper for the WealthLens live-data API. Tools run in the eve
 * runtime (a sibling of the Next.js server), so they consume the app's
 * HTTP endpoints rather than importing its server-only modules.
 */

const BASE_URL =
  process.env.WEALTHLENS_BASE_URL ?? "http://localhost:3000";

export async function fetchLive<T>(
  path: string,
  abortSignal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal: abortSignal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`WealthLens API ${path} failed (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}
