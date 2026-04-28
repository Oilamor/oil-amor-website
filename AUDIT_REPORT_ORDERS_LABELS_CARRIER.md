# Oil Amor — Order Fulfillment, Label & Carrier Oil Audit Report

**Date:** April 2026  
**Auditor:** Kimi Code CLI  
**Scope:** Admin dashboard order display, mixing atelier orders, label generation, QR codes, carrier oil & ratio support  
**Files Examined:** 18 source files across `app/admin/`, `app/api/admin/`, `app/components/admin/`, `lib/atelier/`, `lib/batch/`, `lib/db/schema/`, `lib/orders/`, `lib/content/`, `lib/safety/`

---

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|-------------|
| Admin Order Dashboard | ✅ Functional | 3 bugs (carrier display, ml missing, percentage inverted) |
| Mixing Atelier → Orders | ✅ Works end-to-end | 1 data inconsistency (carrierMl not stored) |
| Label Generation | ✅ Works | 3 bugs (raw carrier ID, inverted percentage, hardcoded safety score) |
| QR Code / Batch Page | ✅ Works | 1 risk (external service dependency) |
| Carrier Oil Support | ⚠️ Limited | Only 2 carrier oils; ratios work but are misinterpreted in admin |
| Many Oils on Label | ✅ Handled | Smart truncation + enlarged QR fallback works well |

**Critical bugs to fix before first real order:** 4 (all labeled 🔴 below).  
**Recommended fixes:** 3 (labeled 🟡).  
**Design limitations:** 2 (labeled ℹ️).

---

## 1. How Orders Show Up in the Admin Dashboard

### 1.1 Order List (`app/components/admin/order-list.tsx`)

- **Table view** with filters: search (order ID, customer name, email, blend name), status dropdown, type dropdown.
- **Type badges:** Custom blends show a purple "Custom" badge.
- **Quick action buttons** at the top:
  - "Needs Mixing" → filters to `confirmed`
  - "Needs Labels" → filters to `quality-check`
  - "Needs Dispatch" → filters to `ready-to-ship`
- **Print Label button** (printer icon) appears on any row where `hasBlendData` is true.

### 1.2 Order Detail Slide-out (`app/components/admin/order-detail.tsx`)

Clicking a row opens a full slide-out panel (not a separate page) showing:

| Section | Data Shown |
|---------|-----------|
| **Header** | Order ID, status badge, timestamp |
| **Customer** | Name, email, phone, guest flag |
| **Shipping** | Full address + tracking link (if added) |
| **Payment** | Method, status, subtotal, total |
| **Items** | Expandable cards per line item |
| **Status Workflow** | Dropdown to change status + optional note + tracking input |
| **Status History** | Reverse-chronological audit trail |
| **Internal Notes** | Staff-only notes |

### 1.3 Item Card (Expanded)

For custom blend items, the expanded card shows:
- **Composition table:** oil name, ml, percentage
- **Carrier row:** carrier oil name, ml, percentage
- **Crystal / Cord / Intended Use** tags
- **Safety Warnings** with score and rating
- **Commission info** (for community blends)
- **Batch ID + QR link**
- **Print Label button**

---

## 2. How Mixing Atelier Orders Appear

### 2.1 Data Flow

```
User builds blend in Mixing Atelier
  ↓
Added to cart as pseudo-product: productId = 'custom-mix'
  ↓
Full recipe stored in cart item.customMix (JSON)
  ↓
Checkout creates order with type = 'custom-mix', requiresBlending = true
  ↓
Stripe webhook confirms payment → status = 'confirmed'
  ↓
Admin dashboard polls GET /api/admin/orders every 30s
  ↓
Order appears with purple "Custom" badge
  ↓
Admin clicks → slide-out shows full composition table
  ↓
Production tab shows card with top 3 oils + "+N more"
```

### 2.2 Production Queue (`app/components/admin/production-queue.tsx`)

- **Grid layout:** 1-col mobile → 3-col desktop
- **Each card shows:**
  - Blend name + "RUSH" badge (if priority = rush)
  - Status icon + label + customer name
  - Bottle size + mode (`pure` / `carrier`)
  - Top 3 oils with ml amounts
  - `+N more oils` if >3
  - Warning count + safety score
  - Crystal / cord tags
  - Action buttons: **Start Mixing** → **Complete** → **Print Label**

### 2.3 Order Data Model (`lib/db/schema-refill.ts` lines 394–516)

Blend data is stored **inline as JSONB** inside the `orders.items` column:

```ts
items: {
  id: string
  type: 'custom-mix'
  name: string
  customMix: {
    recipeName: string
    mode: 'pure' | 'carrier'
    oils: [{ oilId, oilName, ml, percentage }]
    carrierRatio?: number      // 5-75 (ESSENTIAL OIL %, not carrier %)
    carrierOilId?: string      // 'jojoba' | 'fractionated-coconut'
    totalVolume: 5|10|15|20|30|50|100
    crystalId?: string
    cordId?: string
    intendedUse?: string
    safetyScore: number
    safetyRating: string
    safetyWarnings: string[]
    batchId?: string
    labCertified: boolean
  }
}
```

---

## 3. Label Generation System

### 3.1 How Labels Are Generated

**File:** `app/api/admin/labels/generate/route.ts` (651 lines)

1. Admin clicks **Print Label** → `POST /api/admin/labels/order`
2. Order lookup → extracts blend data → generates batch ID (`OA-{date}-{nanoid(4)}`)
3. Forwards to `POST /api/admin/labels/generate` with `LabelData`
4. Returns **HTML string** (not PDF)
5. Client opens new window, writes HTML, calls `window.print()` after 500ms

### 3.2 Label Design

**Wrap-around landscape layout** split into two panels:

| Front Panel (~38%) | Back Panel (~62%) |
|---|---|
| Oil Amor logo (Cormorant Garamond) | "Ingredients & Safety" header |
| "Handcrafted" tagline | Ingredients table (name, ml, %) |
| Blend name | Carrier oil row |
| Type: "Carrier Dilution" or "Pure Essential Oil Blend" | Safety warning badges (colored by severity) |
| Bottle size (e.g., "30ml") | QR code + batch info |
| Intended use tag | Made date + expiry date |
| Crystal name (if set) | "Scan for full recipe & safety" hint |
| Refill banner (if applicable) | |
| `oilamor.com` footer | |

### 3.3 Size Configurations

| Bottle | Width | Height | Max Oils | Max Warnings | QR Size | Font Scale |
|--------|-------|--------|----------|-------------|---------|------------|
| 5ml | 55mm | 18mm | 3 | 2 | 10mm | 0.72 |
| 10ml | 60mm | 20mm | 4 | 2 | 11mm | 0.78 |
| 15ml | 65mm | 22mm | 5 | 3 | 12mm | 0.85 |
| 20ml | 70mm | 25mm | 6 | 3 | 13mm | 0.92 |
| 30ml | 80mm | 30mm | 8 | 4 | 15mm | 1.00 |
| 50ml | 95mm | 35mm | 10 | 5 | 17mm | 1.12 |
| 100ml | 110mm | 40mm | 12 | 6 | 20mm | 1.25 |

### 3.4 Smart Truncation for Many Oils

**Trigger:** `data.oils.length > config.maxOils || warnings.length > config.maxWarnings`

**Fallback behavior:**
1. Show only **first 3 oils** (regardless of bottle size)
2. Show only **critical warnings** (max 2)
3. QR code size increases by **40%**
4. Hidden note appears: `+N more oils / +N more warnings — scan QR for complete info`
5. **No additional pages** — everything else is QR-only

**Example:** A 10-oil blend in a 30ml bottle:
- Label shows: top 3 oils + carrier + "+7 more oils — scan QR for complete info"
- QR enlarged to 21mm
- Customer scans → sees full 10-oil recipe on `/batch/{batchId}`

### 3.5 QR Code Generation

**External service:** `https://api.qrserver.com/v1/create-qr-code/`

- Free, no API key required
- Links to: `https://oilamor.com/batch/{batchId}`
- Size in px: `config.qrSizeMm * 3.78 * (needsFallback ? 1.4 : 1)`

**Batch page** (`app/batch/[batchId]/page.tsx`):
- Public page, no login required
- Shows: full recipe (all oils, ml, %), safety score, warnings, dates, reorder links
- Reads from PostgreSQL `batch_records` table + in-memory LRU fallback (500 items)
- 2-year expiry on batch records

---

## 4. Carrier Oil & Ratio Support

### 4.1 Available Carrier Oils

**Only 2 options** (curated selection):

| ID | Name | Best For | Texture |
|----|------|----------|---------|
| `jojoba` | Jojoba Oil | Facial, acne-prone, balancing | Silky, medium absorption |
| `fractionated-coconut` | Fractionated Coconut Oil | Body massage, sensitive skin | Featherlight, fast absorption |

**Full product catalog** (`lib/content/product-config.ts` lines 105–157) also lists a third pseudo-option:
- `pure` — "Pure Essential Oil (No Carrier)" for collection/configurator products

### 4.2 Ratios Available

**6 preset ratios** in the Mixing Atelier:

| Ratio | Label | Essential Oil % | Carrier Oil % | childrenSafe | pregnancySafe |
|-------|-------|-----------------|---------------|--------------|---------------|
| 5% | Delicate | 5% | 95% | ✅ | ✅ |
| 10% | Gentle | 10% | 90% | ✅ | ✅ |
| 15% | Balanced | 15% | 85% | ❌ | ✅ |
| 25% | Therapeutic | 25% | 75% | ❌ | ❌ |
| 50% | Intensive | 50% | 50% | ❌ | ❌ |
| 75% | Maximum | 75% | 25% | ❌ | ❌ |

> ℹ️ **Note:** The variable `carrierRatio` in code is actually the **essential oil percentage** (strength), NOT the carrier percentage. The carrier percentage = `100 - carrierRatio`.

### 4.3 Safety Validation

**Two-layer system:**

1. **Inline atelier safety** (`app/(shop)/mixing-atelier/page.tsx` lines 332–497)
   - Per-oil flags: pregnancySafe, photosensitive, skinSensitizer, etc.
   - Dangerous combination alerts (blood thinners, epilepsy, pregnancy)
   - Critical warning modal blocks add-to-cart until acknowledged

2. **Comprehensive safety engine** (`lib/safety/comprehensive-safety-v2.ts`, 1,254 lines)
   - Max dilution by age:
     - Adult: 5%
     - Child 6–12: 1%
     - Child 2–6: 0.5%
     - Infant 6m–2y: 0.25%
     - Infant <6m: 0.1% (or avoid)
   - Pregnancy max: 1%
   - Checks: medications, conditions, allergies, phototoxicity stacking, incompatibilities

### 4.4 Pricing

**Atelier blends** (`lib/atelier/atelier-engine.ts` lines 714–788):
- Each oil: wholesale cost + margin divisor
- Additional oil fee: $1 per oil after the first 2
- Crystal: $0.25 × chip count
- Labor: $5 (pure) / $6 (carrier)
- Bottle: $4 buffer × 1.25 markup
- **Carrier oil cost: $0** (subsidized into base price)

**Collection/configurator blends** (`lib/content/pricing-engine-final.ts`):
- Carrier oil costed at $0.083/ml
- Margin divisor for carrier blends: 50%

---

## 5. Bugs & Issues Found

### 🔴 CRITICAL — Label Shows Wrong Carrier Percentage

**File:** `app/api/admin/labels/order/route.ts` line 133  
**File:** `app/api/admin/labels/generate/route.ts` line 289–294

```ts
// order/route.ts:133
carrierPercentage: mix.mode === 'carrier' ? mix.carrierRatio : undefined,

// generate/route.ts:289-294
carrierRow = data.carrierOil ? `
  <tr class="carrier-row">
    <td>${escapeHtml(data.carrierOil)}</td>
    <td>carrier</td>
    <td>${(data.carrierPercentage || 0).toFixed(0)}%</td>
  </tr>
` : '';
```

**Problem:** `carrierRatio` is the **essential oil percentage** (5–75). Passing it as `carrierPercentage` means:
- User selects 25% (therapeutic strength = 25% essential oil, 75% carrier)
- Label shows: **"Carrier: Jojoba Oil, carrier, 25%"**
- Should show: **"Carrier: Jojoba Oil, carrier, 75%"**

**Impact:** Technician and customer see incorrect dilution on the physical label.  
**Fix:** Change to `carrierPercentage: mix.mode === 'carrier' ? (100 - mix.carrierRatio) : undefined`

---

### 🔴 CRITICAL — Label Shows Raw Carrier Oil ID

**File:** `app/api/admin/labels/order/route.ts` line 131

```ts
carrierOil: mix.mode === 'carrier' ? (mix.carrierOilId || 'Jojoba Oil') : undefined,
```

**Problem:** `carrierOilId` is `'jojoba'` or `'fractionated-coconut'` (machine IDs). The label prints this raw string.

**Impact:** Label shows "jojoba" or "fractionated-coconut" instead of "Jojoba Oil" / "Fractionated Coconut Oil".  
**Fix:** Map IDs to human names before passing to label generator:
```ts
const CARRIER_NAMES: Record<string, string> = {
  'jojoba': 'Jojoba Oil',
  'fractionated-coconut': 'Fractionated Coconut Oil',
};
carrierOil: mix.mode === 'carrier' ? (CARRIER_NAMES[mix.carrierOilId] || 'Jojoba Oil') : undefined,
```

---

### 🔴 CRITICAL — Admin Order Detail Shows Wrong Carrier Info

**File:** `app/api/admin/orders/route.ts` line 46  
**File:** `app/api/admin/orders/[id]/route.ts` line 40  
**File:** `app/components/admin/order-detail.tsx` lines 382–394

**Problem 1 (Name):** The mapper sets `carrierOil: item.customMix.carrierOilId`, which is the raw ID string ('jojoba'). The order detail shows "Carrier: jojoba" instead of "Carrier: Jojoba Oil".

**Problem 2 (ML):** Neither mapper computes `carrierMl`. The order detail shows '-' for carrier volume on regular custom mix orders (refills show correct ml via `scaledRecipe`).

**Problem 3 (Percentage):** The mapper sets `carrierPercentage: item.customMix.carrierRatio`. The order detail shows "25%" when it should show "75%" (inverted, same root cause as label bug).

**Impact:** Admin can't accurately read the carrier oil composition when fulfilling orders.  
**Fix:** In both mappers (`orders/route.ts` and `orders/[id]/route.ts`), add:
```ts
const carrierNames: Record<string, string> = {
  'jojoba': 'Jojoba Oil',
  'fractionated-coconut': 'Fractionated Coconut Oil',
};
// ...
carrierOil: item.customMix.carrierOilId ? carrierNames[item.customMix.carrierOilId] || item.customMix.carrierOilId : undefined,
carrierPercentage: item.customMix.carrierRatio ? (100 - item.customMix.carrierRatio) : undefined,
carrierMl: item.customMix.carrierRatio && item.customMix.totalVolume
  ? Math.round((item.customMix.totalVolume * (100 - item.customMix.carrierRatio) / 100) * 10) / 10
  : undefined,
```

---

### 🔴 HIGH — Batch Record Safety Score Is Hardcoded

**File:** `app/api/admin/labels/generate/route.ts` lines 609–610

```ts
safetyScore: 95,
safetyRating: 'safe',
```

**Problem:** The actual blend's `safetyScore` and `safetyRating` are ignored. Every QR scan shows 95/100 and "safe" regardless of warnings.

**Impact:** Customer scans QR → sees misleading safety score. A blend with actual score 45 and "caution" rating appears as 95/"safe".  
**Fix:** Pass `safetyScore` and `safetyRating` through `LabelData` interface and use actual values:
```ts
// Add to LabelData interface:
safetyScore?: number;
safetyRating?: string;

// In buildAndSaveBatchRecord call:
safetyScore: data.safetyScore || 95,
safetyRating: data.safetyRating || 'safe',
```

Also update `app/api/admin/labels/order/route.ts` to forward the mix's actual safety data.

---

### 🟡 MEDIUM — QR Code Depends on External Service

**File:** `app/api/admin/labels/generate/route.ts` line 225–227

```ts
function qrCodeUrl(data: string, size: number): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&data=${encodeURIComponent(data)}`;
}
```

**Problem:** If `api.qrserver.com` is down, rate-limits, or blocks your IP, labels print with broken QR images (`onerror` hides the image, leaving an empty box).

**Impact:** Customers can't scan QR codes; labels look unprofessional.  
**Mitigation:**
- Option A: Use a self-hosted QR library like `qrcode` (npm) to generate Data URIs server-side
- Option B: Add a fallback message below the QR: "If QR doesn't scan, visit oilamor.com/batch/{batchId}"

---

### 🟡 MEDIUM — Font Loading Race Condition in Print

**File:** `app/admin/page.tsx` (print handler)

```ts
// Opens new window, writes HTML, calls .print() after 500ms
```

**Problem:** The generated HTML imports Google Fonts (`@import url('https://fonts.googleapis.com/...')`). On slow connections, fonts may not load before `window.print()` fires, causing fallback fonts and layout shifts.

**Impact:** Label may print with wrong font metrics, potentially cutting off text.  
**Fix:** Add `document.fonts.ready.then(() => window.print())` instead of fixed 500ms timeout, or inline font-face declarations as base64.

---

### 🟡 LOW — Production Queue API Computes Wrong `carrierMl`

**File:** `app/api/admin/production-queue/route.ts` line 66

```ts
carrierMl: mix?.carrierRatio ? (mix.totalVolume * mix.carrierRatio / 100) : undefined,
```

**Problem:** Uses `carrierRatio` (essential oil %) instead of `100 - carrierRatio` (carrier %). However, **this field is not displayed in the production queue UI** (cards only show oil list), so the bug is latent.

**Impact:** If future features read `carrierMl` from production queue items, they'll get wrong data.  
**Fix:** Change to:
```ts
carrierMl: mix?.carrierRatio ? (mix.totalVolume * (100 - mix.carrierRatio) / 100) : undefined,
```

---

### ℹ️ DESIGN LIMITATION — Only 2 Carrier Oils

**File:** `app/(shop)/mixing-atelier/page.tsx` lines 226–251

The atelier offers only Jojoba and Fractionated Coconut. This is intentional ("curated selection") but limits customers who might want:
- Sweet Almond Oil
- Argan Oil
- Rosehip Oil
- Grapeseed Oil
- Avocado Oil

**Recommendation:** If you plan to expand, the data model already supports arbitrary `carrierOilId` strings. You'd only need to:
1. Add new entries to `CARRIER_OILS` array in the atelier page
2. Add pricing in `lib/content/pricing-engine-final.ts`
3. Add safety profiles in `lib/safety/` (if any contraindications)

---

### ℹ️ DESIGN LIMITATION — No True PDF Generation

The label system generates HTML and relies on browser `window.print()`. This means:
- Print quality depends on browser, OS, and printer driver
- No embedded fonts (external Google Fonts)
- No offline printing (needs internet for fonts + QR)
- No label history / reprint audit trail

**Recommendation:** For production scale, consider migrating to a server-side PDF generator like `puppeteer` or `@react-pdf/renderer` for consistent output.

---

## 6. Verified Working Correctly ✅

| Feature | Verification |
|---------|-------------|
| **Order creation** | Blend stored correctly in `orders.items` JSONB with full recipe |
| **Status workflow** | 10 statuses with valid transitions, audit logging, auto-emails |
| **Production queue** | Correctly filters blend/refill items; Start/Complete/Label actions work |
| **Label sizing** | 7 bottle sizes from 5ml to 100ml with appropriate dimensions |
| **Oil truncation** | >maxOils triggers fallback: 3 oils + enlarged QR + hidden note |
| **Warning truncation** | >maxWarnings shows only critical warnings + hidden note |
| **Batch records** | Dual storage (DB + memory LRU); 2-year expiry; correct schema |
| **QR batch page** | Public page shows full recipe, safety, dates; handles expired batches |
| **Refill scaling** | `scaleRecipe()` correctly scales oils and carrier ml by volume ratio |
| **Commission tracking** | Community blends record 10% commission + update creator stats |
| **Safety engine** | Age-appropriate max dilution, pregnancy warnings, drug interaction checks |
| **Cart/checkout display** | Human-readable carrier names stored in `properties` at add-to-cart time |

---

## 7. Fix Priority Matrix

| Priority | Issue | Files to Edit | Effort |
|----------|-------|--------------|--------|
| **P0** | Invert carrier percentage (label + admin) | `labels/order/route.ts`, `orders/route.ts`, `orders/[id]/route.ts` | 15 min |
| **P0** | Map carrierOilId to human name (label + admin) | `labels/order/route.ts`, `orders/route.ts`, `orders/[id]/route.ts` | 15 min |
| **P0** | Compute `carrierMl` in admin mappers | `orders/route.ts`, `orders/[id]/route.ts` | 10 min |
| **P1** | Hardcoded safety score in batch record | `labels/generate/route.ts`, `labels/order/route.ts`, `LabelData` type | 20 min |
| **P1** | External QR service dependency | `labels/generate/route.ts` — add fallback text | 5 min |
| **P2** | Font loading race condition | `app/admin/page.tsx` print handler | 10 min |
| **P2** | Wrong `carrierMl` in production queue API | `api/admin/production-queue/route.ts` | 5 min |

---

## 8. Recommended Test Scenario

Before going live, run this end-to-end test:

1. **Create a carrier blend** in the Mixing Atelier:
   - 3 oils: Lavender 2ml, Bergamot 1ml, Frankincense 1ml
   - Mode: Carrier, Ratio: 25%, Carrier: Jojoba Oil, Bottle: 30ml
   - Add to cart → checkout → pay with Stripe test card

2. **Verify in Admin Dashboard:**
   - Order appears with "Custom" badge
   - Click order → expanded item card shows:
     - Oils: Lavender 2.0ml, Bergamot 1.0ml, Frankincense 1.0ml
     - **Carrier: Jojoba Oil, 22.5ml, 75%** ← verify this is correct after fixes
   - Production queue card shows top 3 oils + "+0 more"

3. **Print Label:**
   - Click Print Label → new window opens
   - Verify front panel: "Carrier Dilution", "30ml"
   - Verify back panel:
     - Oils listed with correct ml/%
     - **Carrier: Jojoba Oil, carrier, 75%** ← verify after fixes
     - Safety badges (if any warnings exist)
     - QR code visible and scannable

4. **Scan QR:**
   - Scan QR code → `/batch/{batchId}` loads
   - Verify full 3-oil recipe shown
   - Verify safety score matches actual atelier calculation
   - Verify carrier shows "Jojoba Oil (carrier)" with correct percentage

5. **Status workflow:**
   - Start Mixing → Complete → Print Label → Add tracking → Shipped
   - Verify email received at each step

---

*End of audit report. All file paths and line numbers verified against commit `8b5f07a`.*
