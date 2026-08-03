# AGENTS.md

## Cursor Cloud specific instructions

WealthLens is a **single-service Next.js 16 app** (App Router, server components, TypeScript strict, Tailwind CSS 4). There is no separate backend, database, or test suite — client/product data is simulated in `src/lib/data/`, priced with live market data at request time.

### Standard commands (see `package.json`)
- Dev server: `npm run dev` (http://localhost:3000, Turbopack, ~250ms to ready). This is the primary way to run the app.
- Lint: `npm run lint` (ESLint via `eslint-config-next`).
- Build: `npm run build` (also runs the TypeScript check). Use `npm run start` only for the production build.
- There is no automated test runner configured; verify changes via lint, build, and manual exercise of the UI/API routes.

### Live data & network egress
- Pages fetch **live, keyless** market data on the server (Yahoo Finance for stocks/ETFs/indices, CoinGecko for BTC/ETH, Frankfurter/ECB for FX) and auto-refresh ~every 60s. Egress to these hosts works in the cloud VM.
- If a source is unreachable, quotes degrade to a baked-in baseline labeled `fallback` (`src/lib/market/fallback.ts`) — the app never hard-fails offline, so a `fallback` label is expected behavior, not a bug.

### AI copilot (Open Code Zen) — important gotcha
- The AI copilot / workbench (`/assistant`, `src/app/api/ai/{chat,generate}`) calls the OpenAI-compatible Open Code Zen gateway and requires `OPENCODE_ZEN_API_KEY` (provided as an environment secret).
- **The source default model `big-pickle` (`src/lib/ai/zen.ts`) is no longer in the Zen catalog and returns HTTP 500 / hangs.** Set a current model via the `OPENCODE_ZEN_MODEL` env var instead of editing source. This repo keeps it in a gitignored `.env.local` (e.g. `OPENCODE_ZEN_MODEL=claude-haiku-4-5`). `.env.local` is NOT committed, so recreate it if it is missing.
- List valid models: `curl -s https://opencode.ai/zen/v1/models -H "Authorization: Bearer $OPENCODE_ZEN_API_KEY"`. The gateway only accepts streaming requests (`stream: true`); the app always streams, so this is only relevant when testing the gateway directly with curl.
- After editing `.env.local`, restart `npm run dev` so Next.js reloads the env.
- Without a valid key/model the rest of the app is fully functional; only the AI panels degrade to setup instructions.
