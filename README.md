# WealthLens — Wealth Management Intelligence for Relationship Managers

A wealth-management intelligence platform built for **relationship managers (RMs)**. Client households are simulated, but everything they hold is a **real financial product priced with live market data**, and an **AI copilot powered by Open Code Zen** turns that data into meeting briefs, next-best-actions, emails and portfolio commentary.

## What's implemented

| Area | Feature |
|---|---|
| **Dashboard** | Book-of-business overview: total AUM, day change, uninvested cash, market pulse (S&P 500, Nasdaq, Dow, Russell 2000, VIX, 10Y yield), biggest portfolio movers, prioritized intelligence feed |
| **Clients** | AUM-ranked client list with live day change, cash and alert counts |
| **Client 360** | Live-priced holdings with unrealized P&L, asset-allocation donut, drift vs risk-profile target, goals with funding progress, advisor notes, activity timeline, per-client alerts |
| **Markets** | Live indices, a 16-symbol watchlist with 1-month sparklines, USD FX crosses (ECB reference rates) — auto-refreshes every minute |
| **Products** | Shelf of 37 real instruments (stocks, Vanguard/iShares/Schwab/Invesco ETFs, BTC/ETH) with live prices, expense ratios and yields |
| **AI Copilot** | Streaming chat grounded in live prices + the full book (or one focused client), via Open Code Zen |
| **AI Workbench** | One-click per-client generation: meeting brief, next-best-actions, check-in email draft, quarterly portfolio commentary |
| **Insights engine** | Deterministic rules that flag: allocation drift, single-stock concentration, cash drag, overdue reviews, stale contact, large daily moves, tax-loss-harvest candidates, RMD deadlines |

### Live data sources (free, keyless)

| Source | Used for | Notes |
|---|---|---|
| Yahoo Finance chart API | Stocks, ETFs, indices, sparklines | 60s in-memory cache |
| CoinGecko | BTC / ETH spot + 24h change | free tier, no key |
| Frankfurter (ECB) | USD FX crosses | 10min cache |

If a source is unreachable, quotes degrade to a baked-in last-known baseline and are labeled `fallback` — the app never breaks offline.

### RAG knowledge corpus (Vercel Blob)

`data/rag-corpus/` holds a simulated internal knowledge base — firm policies (CIO outlook, fee schedule, approved product shelf), compliance manuals, advisor playbooks (concentrated stock, tax-loss harvesting, RMD/QCD, cash deployment), a fixed-income desk note, and meeting/call records for several client households. The documents cross-reference the simulated clients and real products, so retrieval-augmented answers can cite them.

Seed the corpus into a **private Vercel Blob store**:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... npm run seed:blob
```

The script uploads every document under the `rag/` prefix with stable pathnames (idempotent — safe to re-run) plus a `rag/manifest.json` index. Because the store is private, read documents back server-side with `get(pathname, { access: "private" })` or `list()` from `@vercel/blob` — blob URLs are not publicly fetchable.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your Open Code Zen key (optional)
npm run dev                  # http://localhost:3000
```

### Enabling the AI copilot (Open Code Zen)

1. Get an API key at [opencode.ai/auth](https://opencode.ai/auth).
2. Put it in `.env.local`:

```bash
OPENCODE_ZEN_API_KEY=sk-...
OPENCODE_ZEN_MODEL=big-pickle   # or any /chat/completions model from the Zen catalog
```

3. Restart `npm run dev`.

The integration speaks the OpenAI-compatible `POST https://opencode.ai/zen/v1/chat/completions` protocol with streaming, so any Chat-Completions model in the [Zen catalog](https://opencode.ai/docs/zen/) works by changing `OPENCODE_ZEN_MODEL`. Without a key the rest of the app is fully functional; AI panels show setup instructions instead.

Every AI request is **grounded server-side**: the API route assembles a live market snapshot plus the client's freshly priced portfolio, drift, goals, notes and alerts into the system prompt, so answers reflect actual prices — never the model's stale training data.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Dashboard
│   ├── clients/                  # Client list + client 360
│   ├── markets/                  # Live markets
│   ├── products/                 # Product shelf
│   ├── assistant/                # AI copilot chat
│   └── api/ai/
│       ├── chat/route.ts         # Streaming chat (book or client context)
│       └── generate/route.ts     # Task generation (brief/email/commentary/actions)
├── components/                   # UI + client components (chat, workbench, charts)
└── lib/
    ├── data/clients.ts           # 8 simulated households (rich personas)
    ├── data/products.ts          # 37 real products + target allocations
    ├── market/quotes.ts          # Live quote layer: cache + fallback
    ├── portfolio.ts              # Valuation, allocation, drift math
    ├── insights.ts               # Rule-based alert engine
    └── ai/                       # Zen client + prompt-context builders
```

Stack: Next.js 16 (App Router, server components), TypeScript strict, Tailwind CSS 4. Pages render on the server with fresh quotes and auto-refresh every 60 seconds; charts are dependency-free SVG.

## Feature brainstorm / roadmap

Ideas for where to take this next, roughly ordered by value-to-effort:

**AI-first RM workflows**
- **Call summarizer** — paste (or record) a client call, get structured notes, detected action items, and auto-updated CRM fields.
- **Compliance pre-check** — run drafted client communications through an AI reviewer for suitability language, promissory statements and disclosure gaps before sending.
- **"Why is my portfolio down?" explainer** — client-facing narrative generation with attribution (position, asset class, factor) whenever a portfolio moves more than a threshold.
- **Semantic search over notes** — embeddings across all meeting notes and emails ("who mentioned selling a business?", "who is worried about rates?").
- **Proposal generator** — turn a risk profile + product shelf into a compliant investment proposal document with alternatives considered.
- **News-to-book mapping** — ingest an RSS/news feed, have the model tag which holdings/clients each story affects, surface it on the dashboard ("NVDA earnings tonight — 3 clients have >5% exposure").

**Analytics & intelligence**
- Performance attribution and benchmark-relative returns (needs historical position snapshots).
- Monte-Carlo goal-success probabilities per goal, shown next to funding progress.
- Household-level tax lot tracking with realized/unrealized ledger and wash-sale detection.
- Factor/sector look-through of ETFs (real holdings files from issuers) to catch hidden overlaps.
- Churn-risk scoring from engagement signals (contact recency, meeting cadence, withdrawal patterns).

**Data & realtime**
- Streaming quotes over WebSocket/SSE instead of 60s polling.
- More free sources: FRED (rates/macro), SEC EDGAR filings, Treasury yield curve API, issuer ETF holdings CSVs.
- Historical portfolio time series — snapshot valuations daily into a database (Convex would be a natural fit: reactive queries would make the dashboard update live).

**Platform**
- Real persistence and multi-RM auth (Convex + WorkOS/Auth0), replacing the in-memory mock data.
- CRM-style editing: notes, tasks and meeting scheduling from the UI.
- Client-facing portal mode with simplified language and white-labeling.
- PDF export for briefs/commentary; email-send integration.

## Disclaimers

Client names, portfolios, notes and activity are **fictional**. Market data comes from free public endpoints (Yahoo Finance, CoinGecko, Frankfurter) and may be delayed — not for trading. Nothing here is investment advice; AI output requires human review before any client use.
