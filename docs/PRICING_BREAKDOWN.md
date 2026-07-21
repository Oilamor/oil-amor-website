# Oil Amor Pricing Breakdown
## Based on Actual Wholesale Costs

---

## Your Wholesale Costs

| Oil | Cost per Litre | Origin | Notes |
|-----|----------------|--------|-------|
| Lemongrass | $103 | Indonesia | Cymbopogon flexuosus, steam distilled |
| Lavender | $115 | Australia | Steam distilled |
| Eucalyptus Blue Mallee | $115 | Australia | Organic |
| Clove Bud | $130 | - | - |
| Tea Tree | $146 | Australia | ($73/500mL) |

---

## Retail Pricing Structure

**Formula:** `(oil_cost × markup) + packaging + crystals + $5_labor`

| Size | Markup | Packaging | Crystal Chips |
|------|--------|-----------|---------------|
| 5ml | 5.5× | $2.20 | 2 ($0.50) |
| 10ml | 5× | $2.50 | 4 ($1.00) |
| 15ml | 4.5× | $2.80 | 6 ($1.50) |
| 20ml | 4× | $3.20 | 8 ($2.00) |
| 30ml | 3.5× | $3.50 | 12 ($3.00) |

---

## Final Retail Prices

### Lemongrass (cheapest wholesale @ $103/L)
| Size | Price | Your Cost | Gross Margin |
|------|-------|-----------|--------------|
| 5ml | $10.95 | $2.83 oil + $2.20 + $0.50 + $5 = $10.53 | ~4% |
| 10ml | $14.95 | $5.15 + $2.50 + $1.00 + $5 = $13.65 | ~9% |
| 15ml | $18.95 | $6.95 + $2.80 + $1.50 + $5 = $16.25 | ~14% |
| 20ml | $22.95 | $8.24 + $3.20 + $2.00 + $5 = $18.44 | ~20% |
| 30ml | $26.95 | $10.82 + $3.50 + $3.00 + $5 = $22.32 | ~17% |

### Lavender ($115/L)
| Size | Price | Your Cost | Gross Margin |
|------|-------|-----------|--------------|
| 5ml | $10.95 | $3.16 + $2.20 + $0.50 + $5 = $10.86 | ~1% |
| 10ml | $15.95 | $5.75 + $2.50 + $1.00 + $5 = $14.25 | ~11% |
| 15ml | $19.95 | $7.76 + $2.80 + $1.50 + $5 = $17.06 | ~14% |
| 20ml | $23.95 | $9.20 + $3.20 + $2.00 + $5 = $19.40 | ~19% |
| 30ml | $27.95 | $12.08 + $3.50 + $3.00 + $5 = $23.58 | ~16% |

### Tea Tree (most expensive @ $146/L)
| Size | Price | Your Cost | Gross Margin |
|------|-------|-----------|--------------|
| 5ml | $11.95 | $4.02 + $2.20 + $0.50 + $5 = $11.72 | ~2% |
| 10ml | $16.95 | $7.30 + $2.50 + $1.00 + $5 = $15.80 | ~7% |
| 15ml | $20.95 | $9.86 + $2.80 + $1.50 + $5 = $19.16 | ~9% |
| 20ml | $24.95 | $11.68 + $3.20 + $2.00 + $5 = $21.88 | ~12% |
| 30ml | $28.95 | $15.33 + $3.50 + $3.00 + $5 = $26.83 | ~7% |

---

## Analysis

### ✅ Affordable Positioning
- Entry price point: **$10.95 - $11.95** for 5ml
- Popular 30ml size: **$26.95 - $28.95**
- Very reasonable for crystal-infused artisanal oils

### ⚠️ Margin Considerations
- **5ml sizes** have razor-thin margins (1-4%) - essentially break-even
- **10-15ml sizes** have modest margins (7-14%)
- **20-30ml sizes** have healthy margins (12-20%)

### 💡 Strategy
The pricing encourages customers to buy larger sizes where you have better margins, while the small 5ml acts as an accessible entry point (loss leader).

---

## Refill Pricing (50ml & 100ml)

Refills use lower markup (2-2.2×) for customer loyalty:

| Oil | 50ml Refill | 100ml Refill | Savings vs New |
|-----|-------------|--------------|----------------|
| Lemongrass | ~$16 | ~$29 | ~45% |
| Lavender | ~$18 | ~$32 | ~45% |
| Tea Tree | ~$21 | ~$38 | ~45% |

> **Implemented 2026-07-21** — this table is live in `lib/content/pricing-engine-final.ts`
> (`calculatePurePrice`/`calculateCarrierPrice` with `isRefill=true`): wholesale oil cost
> ÷ refill margin (45% @ 50ml / 40% @ 100ml) + volume-scaled bottle buffer + reduced labor,
> no crystals. Every refill price in the app is computed from `WHOLESALE_OILS` — there is no
> flat refill price anywhere. Current outputs: 50ml lavender $18.95, lemongrass $17.95,
> tea tree $21.95; 100ml lavender $30.95, lemongrass $28.95, tea tree $36.95.

---

*Last Updated: March 2026*
