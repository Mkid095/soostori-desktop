# Plan: Add Product Form Overhaul + POS Price Selection

## Context

The Add Product dialog needs UX and flow improvements, and the POS needs to properly handle products with multiple price options (individual + group/offer prices).

## New Step Structure (CONFIRMED)

| Step | Content | File |
|---|---|---|
| 1 - Type | Loose Item / Bulk Box (unchanged) | `TypeStep.tsx` |
| 2 - Details | Name, image (opt), SKU (opt), **barcode auto-focus 300ms**, category dropdown with inline "+ Add", unit | `DetailsStep.tsx` |
| 3 - Pricing & Stock | cost price, selling price, group/offer prices (both modes), **stock qty, low stock alert, track toggle** | `PricingStep.tsx` |
| 4 - Distributor | distributor name + phone (both optional) | `DistributorStep.tsx` |

## Changes by Teammate

### form-redesign (in progress)

**Files created:**
- `src/pages/inventory/components/CategoryInlineAdd.tsx` — inline "+ Add" category input (replaces `CategoryAddPanel.tsx`)

**Files modified:**
- `DetailsStep.tsx` — replace CategoryAddPanel with CategoryInlineAdd, add barcode 300ms auto-focus
- `PricingStep.tsx` — merge stock fields from StockStep, group prices in both loose+bulk modes, AllowSingleUnitToggle in both modes
- `StockStep.tsx` → `DistributorStep.tsx` — rename, remove stock fields, keep only distributor
- `ProductFormModal.tsx` — update STEPS array, import DistributorStep
- `FormNavigationFooter.tsx` — add `pb-4` bottom padding
- `i18n.ts` — new keys: "Pricing & Stock" / "Bei na Hisa", "Distributor" / "Msambazaji"

**Data shapes (confirmed):**
```ts
// ProductFormState — unchanged, all fields already present
{ name, sku, barcode, categoryId, unit, distributorName, distributorPhone,
  costPrice, sellingPrice, stockQuantity, lowStockThreshold, trackInventory,
  allowSingleUnitSale, unitsPerPackage, boxBuyingPrice, bulkSellingPrice }

// groupPrices array
{ quantity: number; price: number }[]
// Example: [{ quantity: 13, price: 5 }] = "13 for KES 5"
```

### pos-price-dialog (waiting on form-redesign confirmation)

**Files created:**
- `src/pages/pos/components/PriceSelectionDialog.tsx` — modal with individual + each group price button

**Files modified:**
- `src/pages/pos/hooks/useCartState.ts` — detect `groupPrices.length > 0 && allowSingleUnitSale === true`, return selection signal instead of direct add
- `src/pages/pos/components/POSCart.tsx` or `ProductCard.tsx` — handle selection signal, show PriceSelectionDialog
- `i18n.ts` — keys: "Select Price" / "Chagua Bei", "Sell Individually" / "Uza Kwa Kila Moja", "Buy {n} for KES {price}" format

**PriceSelectionDialog shape:**
```
Product Name
────────────────────────────
[● Individual — KES X    ]   ← sellingPrice
[  Buy N for KES Y      ]   ← each group price
[  Buy M for KES Z      ]
                      [Cancel]
```

## Verification

1. `pnpm dev` → Add Product dialog → test full step flow
2. Add category inline (dropdown → + Add → type name → pick color → save)
3. Add group prices in loose mode (e.g. "3 for 50", "10 for 150")
4. Toggle individual sale ON/OFF
5. Add product, go to POS, search product
6. Add to cart → if has group prices + individual ON → selection dialog appears
7. Select price → item added at correct unitPrice
8. `tsc --noEmit` passes
9. No file exceeds 150 lines
