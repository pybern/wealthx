import { PRODUCTS } from "@/lib/data/products";
import { getQuotes } from "@/lib/market/quotes";
import { fmtUsd } from "@/lib/portfolio";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, ChangePct, Pill } from "@/components/ui";
import type { AssetClass } from "@/lib/types";

export const dynamic = "force-dynamic";

const CLASS_ORDER: AssetClass[] = [
  "US Equity",
  "International Equity",
  "Fixed Income",
  "Real Assets",
  "Crypto",
];

export default async function ProductsPage() {
  const quotes = await getQuotes(PRODUCTS.map((p) => p.symbol));

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header>
        <h1 className="text-xl font-semibold">Product shelf</h1>
        <p className="mt-1 text-sm text-muted">
          {PRODUCTS.length} real, live-priced instruments approved for client
          portfolios.
        </p>
      </header>

      {CLASS_ORDER.map((assetClass) => {
        const items = PRODUCTS.filter((p) => p.assetClass === assetClass);
        if (items.length === 0) return null;
        return (
          <Card key={assetClass} title={assetClass}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => {
                const quote = quotes.get(product.symbol);
                return (
                  <div
                    key={product.symbol}
                    className="rounded-xl border border-edge bg-surface-2 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold">
                          {product.symbol}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {product.name}
                        </p>
                      </div>
                      {quote && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {fmtUsd(quote.price, 2)}
                          </p>
                          <ChangePct value={quote.changePct} />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                      {product.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Pill>{product.kind}</Pill>
                      {product.issuer && <Pill>{product.issuer}</Pill>}
                      {product.expenseRatio !== undefined && (
                        <Pill>ER {product.expenseRatio.toFixed(2)}%</Pill>
                      )}
                      {product.dividendYield !== undefined && (
                        <Pill>Yield ~{product.dividendYield.toFixed(1)}%</Pill>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
