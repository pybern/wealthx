# Tax-Loss Harvesting Procedure

**Advisory playbook 7, updated 2026-01. Run the harvest inventory quarterly; complete the annual sweep by December 5 to avoid year-end trade-desk congestion.**

## What qualifies

Taxable accounts only. Harvest a lot when its unrealized loss exceeds the greater of $2,000 or 5% of the lot's cost basis. Smaller losses rarely justify the tracking overhead and bid/ask cost.

## Wash-sale rule mechanics

A loss is disallowed if the client buys a "substantially identical" security within 30 days before or after the sale — across **all** household accounts, including IRAs, spousal accounts, and dividend-reinvestment plans. An IRA repurchase permanently destroys the loss (no basis adjustment). Before any harvest:

1. Turn off dividend reinvestment on the harvested security household-wide for the window.
2. Check the last 30 days of buys, including 401(k) contributions that flow into similar index funds.
3. Log the repurchase-eligible date in CRM.

## Approved swap pairs (hold the market, change the index)

| Sell | Replacement | Rationale |
|---|---|---|
| VTI | VOO | Total market → S&P 500; different index, ~99% correlated |
| VOO | VTI or IWM+VOO barbell | Same logic reversed |
| VEA | VXUS | Developed-only → total international; different index |
| VXUS | VEA | Accepts temporary EM gap, or add VWO after 31 days |
| QQQ | VOO + growth tilt | No direct pair; document the tracking difference |
| AGG | BND | Different providers/indexes, near-identical exposure |
| MUB | Short-term muni ladder | Preserves tax-exempt income |
| SCHD | VIG | Dividend quality maintained; yield drops ~1.8 points — flag for income clients |

Single stocks have **no** substantially-identical replacement: harvest into the sector ETF or sit in VOO for 31 days, and document that the client accepts single-name re-entry risk.

## Sizing the benefit

Realized losses offset realized gains dollar-for-dollar, then up to $3,000 of ordinary income per year, with indefinite carryforward. For a client in the 37% bracket with $50k of gains from a staged concentration sale, a $50k harvest is worth up to ~$11,850 in federal tax deferred (20% LTCG + 3.8% NIIT). Always describe harvesting as **deferral plus rate arbitrage**, not tax elimination — basis resets lower.

## Common errors to avoid

- Harvesting inside 30 days of a client's automated monthly buy of the same fund.
- Swapping into a fund the client already holds at a gain in an IRA, complicating later rebalancing.
- Harvesting a loss the same year the client expects unusually low income (losses are worth more against high-bracket years).
- Forgetting state rules: some states do not allow loss carryforwards.
