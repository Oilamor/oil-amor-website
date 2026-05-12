# Community Blend Commission System — End-to-End Audit Report

**Date:** 2026-04-29
**Auditor:** Kimi Code CLI
**Scope:** Commission tracking, admin dashboard, customer dashboard, bottle size scaling, blend secrets/revelation
**Status:** Complete — 3 critical bugs fixed, 8 gaps identified

---

## Executive Summary

| System | Backend | Frontend | Overall |
|--------|---------|----------|---------|
| Commission Tracking (10%) | ✅ Functional | ❌ No creator dashboard | Partial |
| Admin Commission Dashboard | ✅ Lists & pays commissions | ⚠️ Missing buyer name, stats, export | Partial |
| Customer Store Credits | ✅ Tracked in DB | ❌ No redemption UI | Broken |
| Bottle Size Scaling | ⚠️ Ratios preserved | ❌ No minimum-size validation | Risky |
| Blend Secrets / Codex | ✅ Stored & shared | ✅ Same UI as atelier | Complete |

**Critical Bugs Fixed (3):**
1. `saleAmount !== order.total` validation rejected valid multi-item orders
2. `pendingCommission` never incremented → went negative when admin paid
3. Dead `recordCommission()` function confused the codebase

---

## 1. Commission Tracking — Purchase → Payout

### 1.1 Commission Rate: 10% ✅

Canonical constant:
```ts
// lib/community-blends/commissions-types.ts
export const CREATOR_COMMISSION_RATE = 10; // 10% commission rate
```

The actual math in `awardBlendCommission()` uses this constant. Previously, comments and API responses incorrectly stated "5%"; these have been corrected.

### 1.2 Purchase Flow (LIVE PATH)

```
Stripe webhook
  └─> app/api/stripe/webhook/route.ts
      └─> completeOrderProcessing()          [lib/orders/order-completion.ts]
          └─> For each item with blendId:
              └─> recordBlendPurchase()      [lib/community-blends/actions.ts]
                  └─> awardBlendCommission() [lib/community-blends/commissions.ts]
                      ├─> INSERT blendCommissions (status='purchased')
                      ├─> UPDATE communityBlends (purchaseCount++, popularityScore++)
                      ├─> UPDATE userBlendStats (totalCommissionEarned++, pendingCommission++, totalPurchasesOfBlends++)
                      └─> addCommissionToStoreCredit()
                          ├─> UPDATE/INSERT customerCredits (balance += commission)
                          └─> INSERT creditTransactions (type='earned')
```

**Idempotency:** Unique constraint on `(orderId, blendId)` prevents duplicate commissions.

### 1.3 When Does the Creator Get Paid?

- **Immediately:** Store credit balance is incremented the moment the Stripe webhook succeeds.
- **Formally:** Admin marks the commission as `paid` via the admin dashboard. This decrements `pendingCommission`.

### 1.4 Bugs Found & Fixed

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `app/api/community-blends/purchase/route.ts` | `saleAmount !== order.total` failed when order included shipping, tax, or other items | Changed to `saleAmount > 0 && saleAmount <= order.total` |
| 2 | `app/api/community-blends/purchase/route.ts` | Response hard-coded `commissionRate: 5` | Now imports and returns `CREATOR_COMMISSION_RATE` (10) |
| 3 | `lib/community-blends/commissions.ts` | `awardBlendCommission()` never incremented `pendingCommission` | Added `pendingCommission` to `INSERT` and `onConflictDoUpdate` |
| 4 | `lib/orders/order-enricher.ts` | Dead `recordCommission()` duplicated logic and confused developers | **Removed** |

---

## 2. Admin Dashboard — Commission Display

### 2.1 What the Admin CAN See ✅

| Feature | Location | Status |
|---------|----------|--------|
| Blend name | Commissions table | ✅ |
| Creator name | Commissions table + order detail | ✅ |
| Sale amount | Commissions table | ✅ |
| Commission amount (10%) | Commissions table + order detail expanded view | ✅ |
| Commission rate | Commissions table + order detail | ✅ |
| Status badge (Pending/Paid/Refunded) | Commissions table | ✅ |
| Date | Commissions table | ✅ |
| Pay button (single) | Commissions table Actions column | ✅ |
| Commission info per item | Order detail expanded card | ✅ |
| Aggregated totals (pending/paid) | Commission tab summary cards | ✅ |

### 2.2 What the Admin CANNOT See / Missing ❌

| Missing Feature | Impact | Priority |
|-----------------|--------|----------|
| **Buyer name** | Can't see who purchased | High |
| **Order ID link** | Can't jump to order detail | Medium |
| **Creator stats in UI** | `creatorStats` fetched by API but never rendered | Medium |
| **Commission stats in top stats cards** | `StatsCards` receives `totalCommissions` but ignores it | Low |
| **Bulk pay** | Must click one-by-one | Low |
| **Pagination** | API supports it, UI fetches all | Low |
| **Creator filter dropdown** | API supports `?creatorId=`, UI has no filter | Low |
| **CSV/Excel export** | No export capability | Low |
| **Payout method / external payout** | No way to record bank/PayPal transfer | Medium |

### 2.3 Admin Pay API Behavior

`POST /api/admin/commissions/[id]/pay`:
1. Validates admin auth
2. Updates `blendCommissions.status = 'paid'`
3. Decrements `userBlendStats.pendingCommission`
4. **Does NOT touch `customerCredits.balance`** (creator already received store credit at purchase time)

> **Note:** If the business intends to pay creators via external bank transfer rather than store credit, the current flow pays them twice (store credit + external). A toggle or deduction from balance would be needed.

---

## 3. Customer Dashboard — Store Credits & Commissions

### 3.1 Store Credit Tracking ✅ (Backend Only)

Two tables in `lib/db/schema-refill.ts`:
- `customerCredits` — balance per customer (cents)
- `creditTransactions` — full audit trail (`earned` | `used` | `expired` | `adjusted`)

Commission credits:
- Never expire (`expiresAt: null`)
- Added immediately on successful purchase
- Reversed on refund via `reverseBlendCommission()`

### 3.2 Store Credit Redemption ❌ (Missing)

| Location | Credit Support? |
|----------|-----------------|
| Cart page (`app/(shop)/cart/page.tsx`) | ❌ No display or input |
| Checkout page (`app/(shop)/checkout/page.tsx`) | ❌ Stripe redirect only |
| Stripe checkout API (`app/api/stripe/checkout/route.ts`) | ❌ No credit logic |

The `orders` table has `storeCreditUsed` and `giftCardUsed` columns, but no frontend ever populates them. The `useCredits()` function in `lib/refill/credits.ts` exists but is **never called from checkout**.

### 3.3 Creator Earnings Page ❌ (Missing)

- **Backend API exists:** `GET /api/community-blends/earnings?creatorId=xxx` returns `totalEarned`, `pendingAmount`, `totalSales`, `blendCount`, `history[]`
- **Frontend page:** None. No "My Earnings", "My Commissions", or creator dashboard in `app/(shop)/`.

### 3.4 Account Dashboard Tabs

Current tabs in `app/(shop)/account/page.tsx`:
- `overview` — orders, oils unlocked, total saved, day streak
- `collection` — unlocked oils grid
- `orders` — order history
- `returns` — eligible returns

**Missing:** `earnings`, `credits`, `creator-dashboard`

---

## 4. Bottle Size Scaling for Community Blends

### 4.1 Size Selection ✅

Customers can choose any size (5, 10, 15, 20, 30ml) on the community blend detail page:

```tsx
// app/(shop)/community-blends/[slug]/blend-detail-client.tsx
{[5, 10, 15, 20, 30].map((size) => (
  <button key={size} onClick={() => setSelectedSize(size)}>
    {size}ml
  </button>
))}
```

Defaults to the creator's original `bottleSize`.

### 4.2 Scaling Logic ✅ (Mathematically Correct)

```tsx
const scaledOils = blend.recipe.oils.map(oil => {
  const ratio = oil.ml / blend.recipe.bottleSize
  return { ...oil, ml: Math.round(ratio * selectedSize * 10) / 10 }
})
```

Ratios are preserved exactly. Rounding is to 0.1ml increments.

### 4.3 Minimum Viable Size ❌ (No Validation)

**Critical gap:** There is **no enforcement** that a scaled recipe is physically possible.

| Scenario | Result |
|----------|--------|
| 30ml blend with 0.5ml oil → scaled to 5ml | `0.5 × (5/30) = 0.083ml` → rounds to **0.0ml** |
| Oil disappears silently | Customer gets a blend missing that oil |
| Atelier loads 0ml values | Accepted without validation |

The only validation anywhere is `validateScaledRecipe()` in `lib/refill/recipe-scaling.ts`, which emits a **warning** (not a block) for oils < 0.3ml. It is **not used** in the community blend purchase flow.

**Recommendation:** Add a `canScaleTo(size)` check that:
1. Computes scaled amounts
2. Rejects sizes where any oil rounds to < 0.1ml
3. Disables those size buttons in the UI

### 4.4 Backend Scaling

The order enricher (`lib/orders/order-enricher.ts`) does **not** call `scaleRecipe()` for community blends. It copies the original recipe amounts into the order. This means:
- The order record contains the **original creator amounts**, not the customer-selected size amounts
- The production queue would see the original 30ml recipe even if the customer ordered 5ml

**This is a data integrity bug.** The scaled recipe from the frontend should be passed through the cart and stored in the order.

---

## 5. Blend Secrets / Living Blend Codex

### 5.1 Feature Overview ✅

The **Living Blend Codex** is a programmatically generated "soul profile" for every custom blend. It includes:
- Identity (`soulHash`, procedural name, uniqueness score)
- Aura (colors, gradient CSS)
- Essence (narrative paragraph)
- Composition (oil breakdown, vibrational frequency, elemental balance, aromatic notes)
- Component Weave (crystal, cord, carrier influence)
- Therapeutic Profile (scored categories)
- Application Methods (diffusion, topical, inhalation, bath)
- Timing & Maturation (best time, season, lunar phase, shelf life)
- Safety (level, phototoxicity, pregnancy safety, contraindications)
- Ritual (intention, application guidance, storage)
- Blend Science (chemistry, synergies)

### 5.2 Community Blend Revelation ✅

When a customer views a community blend:
- If `blend.revelationData` exists, a **"View Blend Revelation"** button appears
- Clicking opens the **same `<LivingBlendCodex>` modal** used in the mixing atelier
- UI is 100% identical between atelier and community blend pages

### 5.3 Save / Print ✅

Inside the codex modal:
- **"Save as PDF"** → calls `POST /api/codex/pdf` → returns styled HTML → `window.print()`
- **"Share (Email)"** → placeholder (no SendGrid/Resend integration wired up)

### 5.4 Data Flow ✅

```
Mixing Atelier
  └─> User clicks "Reveal Blend Secrets"
      └─> `blendCodex` generated [lib/atelier/living-blend-codex.ts]
          └─> Stored in `OrderCustomMix.revelationData`
              └─> Order completes
                  └─> `extractCommunityBlendShares()` [lib/orders/order-completion.ts]
                      └─> `revelationData: share.recipe.revelationData`
                          └─> Stored in `communityBlends.revelationData`
                              └─> Displayed on community blend detail page
```

### 5.5 Caveat

If the creator did **not** generate a codex before adding to cart (e.g., skipped the revelation step), `revelationData` is `null` and **no revelation button appears** on the community blend page.

---

## 6. Code Changes Made During Audit

| File | Change | Lines |
|------|--------|-------|
| `app/api/community-blends/purchase/route.ts` | Fixed comment 5% → 10%; imported `CREATOR_COMMISSION_RATE`; fixed `saleAmount` validation; fixed response `commissionRate` | 4, 10, 39-54, 70 |
| `lib/community-blends/commissions.ts` | Fixed JSDoc 5% → 10%; added `pendingCommission` to `INSERT` and `onConflictDoUpdate` | 4, 97, 102 |
| `lib/orders/order-enricher.ts` | Removed dead `recordCommission()` function; removed unused imports (`blendCommissions`, `userBlendStats`, `sql`) | 189-255, 9-10 |

---

## 7. Recommendations

### Immediate (High Priority)
1. **Add store credit redemption to checkout** — customers have credits they can't spend
2. **Add creator earnings page** — `GET /api/community-blends/earnings` exists but has no UI
3. **Add minimum-size validation to community blend scaling** — prevent oils from rounding to 0ml
4. **Pass scaled recipe through cart to order** — backend order record should reflect the size the customer actually selected

### Short-Term (Medium Priority)
5. **Add buyer name to admin commissions table**
6. **Link order ID in admin commissions table**
7. **Render creator stats in admin commission dashboard**
8. **Display commission stats in admin `StatsCards`**
9. **Add store credit balance to customer account overview**

### Long-Term (Low Priority)
10. **Bulk pay commissions**
11. **CSV export for commissions**
12. **Pagination for commissions table**
13. **Creator filter dropdown in admin**
14. **Wire up email sharing for codex PDFs**
