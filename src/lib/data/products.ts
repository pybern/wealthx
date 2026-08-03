import type { AssetClass, Product, RiskProfile } from "../types";

/**
 * Real, investable financial products. Symbols are live Yahoo Finance
 * tickers (crypto uses CoinGecko ids) so every price shown in the app
 * reflects actual market data.
 */
export const PRODUCTS: Product[] = [
  // ── Individual equities ────────────────────────────────────────────
  { symbol: "AAPL", name: "Apple Inc.", kind: "Stock", assetClass: "US Equity", dividendYield: 0.4, description: "Consumer electronics and services giant; iPhone, Mac, wearables and a fast-growing services segment." },
  { symbol: "MSFT", name: "Microsoft Corporation", kind: "Stock", assetClass: "US Equity", dividendYield: 0.7, description: "Enterprise software, Azure cloud and AI infrastructure leader." },
  { symbol: "NVDA", name: "NVIDIA Corporation", kind: "Stock", assetClass: "US Equity", dividendYield: 0.02, description: "Dominant designer of GPUs and accelerated-computing platforms for AI datacenters." },
  { symbol: "AMZN", name: "Amazon.com, Inc.", kind: "Stock", assetClass: "US Equity", description: "E-commerce and AWS cloud computing leader." },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", kind: "Stock", assetClass: "US Equity", description: "Search, advertising, YouTube, Google Cloud and AI research (Gemini, DeepMind)." },
  { symbol: "TSLA", name: "Tesla, Inc.", kind: "Stock", assetClass: "US Equity", description: "Electric vehicles, energy storage and autonomy." },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", kind: "Stock", assetClass: "US Equity", dividendYield: 2.0, description: "Largest US bank by assets; diversified banking and asset management." },
  { symbol: "JNJ", name: "Johnson & Johnson", kind: "Stock", assetClass: "US Equity", dividendYield: 3.0, description: "Diversified healthcare: pharmaceuticals and medtech. Dividend King." },
  { symbol: "XOM", name: "Exxon Mobil Corporation", kind: "Stock", assetClass: "US Equity", dividendYield: 3.3, description: "Integrated oil and gas supermajor." },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc. (Class B)", kind: "Stock", assetClass: "US Equity", description: "Warren Buffett's diversified holding company." },
  { symbol: "COST", name: "Costco Wholesale Corporation", kind: "Stock", assetClass: "US Equity", dividendYield: 0.5, description: "Membership warehouse retailer with exceptional customer loyalty." },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated", kind: "Stock", assetClass: "US Equity", dividendYield: 2.0, description: "Largest US health insurer plus Optum health services." },
  { symbol: "V", name: "Visa Inc.", kind: "Stock", assetClass: "US Equity", dividendYield: 0.7, description: "Global payments network." },
  { symbol: "PG", name: "The Procter & Gamble Company", kind: "Stock", assetClass: "US Equity", dividendYield: 2.7, description: "Consumer staples leader; Tide, Pampers, Gillette. Dividend King." },
  { symbol: "HD", name: "The Home Depot, Inc.", kind: "Stock", assetClass: "US Equity", dividendYield: 2.5, description: "Largest home-improvement retailer." },

  // ── Core equity ETFs ───────────────────────────────────────────────
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.03, dividendYield: 1.3, issuer: "Vanguard", description: "Tracks the S&P 500 index of large-cap US stocks." },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.03, dividendYield: 1.3, issuer: "Vanguard", description: "Broadest US equity exposure: ~3,600 large-, mid- and small-cap stocks." },
  { symbol: "QQQ", name: "Invesco QQQ Trust", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.2, dividendYield: 0.6, issuer: "Invesco", description: "Tracks the Nasdaq-100; heavy mega-cap tech tilt." },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.06, dividendYield: 3.5, issuer: "Schwab", description: "High-quality US dividend payers with 10+ year payout histories." },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.06, dividendYield: 1.7, issuer: "Vanguard", description: "US companies with 10+ consecutive years of dividend growth." },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.19, dividendYield: 1.2, issuer: "BlackRock", description: "US small-cap exposure via the Russell 2000." },
  { symbol: "ARKK", name: "ARK Innovation ETF", kind: "ETF", assetClass: "US Equity", expenseRatio: 0.75, issuer: "ARK Invest", description: "Actively managed disruptive-innovation fund. High volatility." },

  // ── International equity ETFs ──────────────────────────────────────
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", kind: "ETF", assetClass: "International Equity", expenseRatio: 0.07, dividendYield: 3.0, issuer: "Vanguard", description: "All-world ex-US: developed and emerging markets." },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", kind: "ETF", assetClass: "International Equity", expenseRatio: 0.05, dividendYield: 3.0, issuer: "Vanguard", description: "Developed markets ex-US: Europe, Japan, Canada, Australia." },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", kind: "ETF", assetClass: "International Equity", expenseRatio: 0.08, dividendYield: 3.3, issuer: "Vanguard", description: "Emerging markets: China, India, Taiwan, Brazil and more." },

  // ── Fixed income ETFs ──────────────────────────────────────────────
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.03, dividendYield: 4.4, issuer: "BlackRock", description: "Broad US investment-grade bond market benchmark." },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.03, dividendYield: 4.4, issuer: "Vanguard", description: "Total US investment-grade bond market." },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.15, dividendYield: 4.4, issuer: "BlackRock", description: "Long-duration US Treasuries; high rate sensitivity." },
  { symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.15, dividendYield: 4.2, issuer: "BlackRock", description: "Short-duration Treasuries; cash-plus stability." },
  { symbol: "MUB", name: "iShares National Muni Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.05, dividendYield: 3.2, issuer: "BlackRock", description: "Investment-grade municipal bonds; federally tax-exempt income." },
  { symbol: "LQD", name: "iShares iBoxx $ Investment Grade Corporate Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.14, dividendYield: 4.9, issuer: "BlackRock", description: "US investment-grade corporate credit." },
  { symbol: "TIP", name: "iShares TIPS Bond ETF", kind: "ETF", assetClass: "Fixed Income", expenseRatio: 0.19, dividendYield: 3.0, issuer: "BlackRock", description: "Treasury Inflation-Protected Securities." },

  // ── Real assets ────────────────────────────────────────────────────
  { symbol: "GLD", name: "SPDR Gold Shares", kind: "ETF", assetClass: "Real Assets", expenseRatio: 0.4, issuer: "State Street", description: "Physical gold bullion trust." },
  { symbol: "VNQ", name: "Vanguard Real Estate ETF", kind: "ETF", assetClass: "Real Assets", expenseRatio: 0.13, dividendYield: 3.9, issuer: "Vanguard", description: "US equity REITs across sectors." },

  // ── Digital assets ─────────────────────────────────────────────────
  { symbol: "BTC", name: "Bitcoin", kind: "Crypto", assetClass: "Crypto", coingeckoId: "bitcoin", description: "Largest cryptocurrency by market cap; digital store of value." },
  { symbol: "ETH", name: "Ethereum", kind: "Crypto", assetClass: "Crypto", coingeckoId: "ethereum", description: "Leading smart-contract platform." },
];

export const PRODUCT_MAP: Map<string, Product> = new Map(
  PRODUCTS.map((p) => [p.symbol, p]),
);

export function getProduct(symbol: string): Product {
  const product = PRODUCT_MAP.get(symbol);
  if (!product) throw new Error(`Unknown product symbol: ${symbol}`);
  return product;
}

/** Strategic asset-allocation targets per risk profile (percent). */
export const TARGET_ALLOCATIONS: Record<
  RiskProfile,
  Partial<Record<AssetClass, number>>
> = {
  Conservative: { "US Equity": 20, "International Equity": 5, "Fixed Income": 55, "Real Assets": 5, Cash: 15 },
  "Moderately Conservative": { "US Equity": 30, "International Equity": 10, "Fixed Income": 45, "Real Assets": 5, Cash: 10 },
  Moderate: { "US Equity": 40, "International Equity": 15, "Fixed Income": 35, "Real Assets": 5, Cash: 5 },
  "Moderately Aggressive": { "US Equity": 50, "International Equity": 20, "Fixed Income": 20, "Real Assets": 5, Cash: 5 },
  Aggressive: { "US Equity": 60, "International Equity": 20, "Fixed Income": 10, "Real Assets": 5, Crypto: 2, Cash: 3 },
};

/** Yahoo Finance symbols for the market overview. */
export const MARKET_INDICES: { symbol: string; label: string }[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq Composite" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "^TNX", label: "US 10Y Yield" },
];
