export type AssetClass =
  | "US Equity"
  | "International Equity"
  | "Fixed Income"
  | "Real Assets"
  | "Crypto"
  | "Cash";

export type ProductKind = "Stock" | "ETF" | "Crypto" | "Cash";

export interface Product {
  /** Ticker symbol (Yahoo Finance format) or crypto id */
  symbol: string;
  name: string;
  kind: ProductKind;
  assetClass: AssetClass;
  /** Annual expense ratio in percent, for funds */
  expenseRatio?: number;
  /** Approximate trailing dividend / distribution yield in percent */
  dividendYield?: number;
  issuer?: string;
  description: string;
  /** CoinGecko id, only for crypto products */
  coingeckoId?: string;
}

export type AccountType =
  | "Taxable"
  | "Traditional IRA"
  | "Roth IRA"
  | "401(k)"
  | "Trust"
  | "529";

export interface Holding {
  symbol: string;
  quantity: number;
  /** Average cost per unit in USD */
  costBasis: number;
  account: AccountType;
}

export type RiskProfile =
  | "Conservative"
  | "Moderately Conservative"
  | "Moderate"
  | "Moderately Aggressive"
  | "Aggressive";

export type Segment = "Private Wealth" | "Affluent" | "Core";

export interface Goal {
  name: string;
  targetAmount: number;
  targetYear: number;
  fundedPct: number;
  priority: "High" | "Medium" | "Low";
}

export interface Note {
  date: string;
  author: string;
  text: string;
}

export interface Activity {
  date: string;
  type: "Deposit" | "Withdrawal" | "Trade" | "Meeting" | "Call" | "Email";
  description: string;
  amount?: number;
}

export interface Client {
  id: string;
  name: string;
  age: number;
  occupation: string;
  city: string;
  email: string;
  phone: string;
  segment: Segment;
  riskProfile: RiskProfile;
  clientSince: number;
  lastContact: string;
  nextReviewDue: string;
  /** Uninvested cash across accounts, USD */
  cash: number;
  holdings: Holding[];
  goals: Goal[];
  notes: Note[];
  activities: Activity[];
  personal: string;
  interests: string[];
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  currency: string;
  asOf: string;
  source: "live" | "fallback";
}

export interface FxRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  source: "live" | "fallback";
}

export interface PricedHolding extends Holding {
  product: Product;
  quote: Quote;
  marketValue: number;
  gain: number;
  gainPct: number;
  dayChange: number;
  weightPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  investedValue: number;
  cash: number;
  totalGain: number;
  totalGainPct: number;
  dayChange: number;
  dayChangePct: number;
  allocation: { assetClass: AssetClass; value: number; pct: number }[];
  holdings: PricedHolding[];
}

export type InsightSeverity = "action" | "warning" | "info";

export interface Insight {
  clientId: string;
  clientName: string;
  severity: InsightSeverity;
  category: string;
  title: string;
  detail: string;
}
