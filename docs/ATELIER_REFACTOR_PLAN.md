# Atelier Page Refactoring Plan

## Current State

- **File:** `app/(shop)/mixing-atelier/page.tsx`
- **Size:** ~5,150 lines
- **Components defined inline:** 16
- **Risk:** High — single file contains UI, business logic, safety validation, pricing, cart integration, and state management

## Target Architecture

```
app/(shop)/mixing-atelier/
├── page.tsx                    (~800 lines — orchestration only)
├── layout.tsx                  (if needed)
├── components/
│   ├── AtelierShell.tsx        (layout wrapper, mode toggle)
│   ├── OilSelector.tsx         (search + grid + add/remove)
│   ├── BlendChamber.tsx        (already exists — keep extracted)
│   ├── OilAmountControl.tsx    (already exists — keep extracted)
│   ├── CordSelector.tsx        (already exists — keep extracted)
│   ├── CrystalSelector.tsx     (crystal grid + selection)
│   ├── CarrierConfigurator.tsx (carrier oil + ratio)
│   ├── SafetyPanel.tsx         (warnings + acknowledgment)
│   ├── BlendSummary.tsx        (name, desc, tags, pricing)
│   ├── ActionBar.tsx           (save, share, cart, certificate)
│   └── Modals/
│       ├── OilDetailModal.tsx      (already exists)
│       ├── SaveDraftDialog.tsx     (already exists)
│       ├── CriticalWarningModal.tsx
│       └── ShareModal.tsx
├── hooks/
│   ├── useAtelierState.ts      (all useState + useReducer)
│   ├── useBlendValidation.ts   (safety + ratio checks)
│   ├── useBlendPricing.ts      (price calculation)
│   └── useDraftPersistence.ts  (localStorage + URL param)
└── data/
    └── oil-safety-profiles.ts  (extract from page)
```

## Extraction Order (Priority)

### Phase 1: Pure UI Components (Safe, No Logic)
| Component | Lines | Destination | Effort |
|-----------|-------|-------------|--------|
| `Toast` | ~35 | `app/components/toast.tsx` | ✅ Done |
| `Tooltip` | ~35 | `app/components/tooltip.tsx` | ✅ Done |
| `OilSafetyBadge` | ~50 | `app/components/atelier/OilSafetyBadge.tsx` | 20 min |
| `MironVioletGlassBanner` | ~85 | `app/components/atelier/MironBanner.tsx` | 20 min |

### Phase 2: Modal Dialogs (Self-Contained)
| Component | Lines | Destination | Effort |
|-----------|-------|-------------|--------|
| `OilDetailModal` | ~290 | `app/(shop)/mixing-atelier/components/Modals/OilDetailModal.tsx` | 1 hour |
| `SaveDraftDialog` | ~100 | `app/(shop)/mixing-atelier/components/Modals/SaveDraftDialog.tsx` | 30 min |
| `CriticalWarningModal` | ~110 | `app/(shop)/mixing-atelier/components/Modals/CriticalWarningModal.tsx` | 30 min |

### Phase 3: State Hooks (High Impact)
| Hook | State Managed | Destination | Effort |
|------|---------------|-------------|--------|
| `useAtelierState` | All useState + draft loading | `app/(shop)/mixing-atelier/hooks/useAtelierState.ts` | 2-3 hours |
| `useDraftPersistence` | localStorage + URL encode/decode | `app/(shop)/mixing-atelier/hooks/useDraftPersistence.ts` | 1 hour |

### Phase 4: Feature Sections (Medium Complexity)
| Component | Lines | Destination | Effort |
|-----------|-------|-------------|--------|
| `SafetyPanel` | ~230 | `app/(shop)/mixing-atelier/components/SafetyPanel.tsx` | 1-2 hours |
| `CrystalSelector` | ~220 | `app/(shop)/mixing-atelier/components/CrystalSelector.tsx` | 1-2 hours |
| `CarrierConfigurator` | ~180 | `app/(shop)/mixing-atelier/components/CarrierConfigurator.tsx` | 1 hour |
| `ActionBar` | ~200 | `app/(shop)/mixing-atelier/components/ActionBar.tsx` | 1 hour |

### Phase 5: Data Extraction
| Data | Destination | Effort |
|------|-------------|--------|
| `OIL_SAFETY_PROFILES` | `app/(shop)/mixing-atelier/data/oil-safety-profiles.ts` | 30 min |
| `CARRIER_EDUCATION` | `app/(shop)/mixing-atelier/data/carrier-education.ts` | 20 min |

## Estimated Impact

| Phase | Lines Removed from page.tsx | Effort |
|-------|----------------------------|--------|
| 1 | ~200 | 1 hour |
| 2 | ~500 | 2 hours |
| 3 | ~400 | 3-4 hours |
| 4 | ~1,000 | 4-5 hours |
| 5 | ~300 | 1 hour |
| **Total** | **~2,400** | **2-3 days** |

## Final Target

- `page.tsx`: ~800 lines (down from 5,150)
- Components: 12-16 extracted files
- Hooks: 3-4 custom hooks
- Testable: Each component/hook can be unit tested independently
