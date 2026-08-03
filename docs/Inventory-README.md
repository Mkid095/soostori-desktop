# Inventory — Stock Management

## Purpose

The Inventory module manages the product catalog, stock quantities, categories, and the stock movement audit trail. It supports barcode generation, product variants, and per-unit vs. bulk pricing.

## Architecture

```
Product data → Category assignment → Stock tracking → Stock movement audit
```

### Key Flows

**Product Management:**
```
Create/Edit product → Assign category → Set pricing (cost, selling, bulk) → Set stock + thresholds → Save
```

**Stock Adjustment:**
```
Select product → Enter quantity change (+/-) → Select reason (adjustment, return, etc.) → Save
  → Updates product.stock_quantity
  → Inserts stock_movements record
  → Inserts stock_adjustment_log record
```

**Barcode Lookup:**
```
Enter/scan barcode → lookupBarcode(barcode) → Returns product or null
```

## Data Flow

```
Renderer (Inventory.tsx)
  │  useDatabase hooks (getProducts, createProduct, adjustStock, getStockMovements)
  │  window.electronAPI.db.*
  ▼
Preload (preload.ts)
  │  ipcRenderer.invoke('db:products:...', 'db:inventory:...')
  ▼
Main Process — IPC handlers (database-handlers.ts)
  │  SQLite via better-sqlite3
  ▼
soostori.db — products, categories, stock_movements, stock_adjustment_log tables
```

## Main Files

| File | Responsibility |
|------|---------------|
| `src/pages/Inventory.tsx` | Inventory page UI — product table, edit modal, category sidebar |
| `src/lib/types.ts` | Product, Category, StockMovement types |
| `src/hooks/useDatabase.ts` | Hooks: useProducts, useCategories, useAdjustStock, useStockMovements |
| `electron/database/index.ts` | SQLite schema: products, categories, stock_movements, stock_adjustment_log |
| `electron/ipc-handlers/database-handlers.ts` | IPC handlers for products CRUD, stock adjustment, barcode lookup |

## Key Types

```typescript
interface Product {
  id: string
  categoryId?: string
  name: string
  sku?: string
  barcode?: string
  costPrice: number
  sellingPrice: number
  discountPrice?: number
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  trackInventory: boolean
  allowSingleUnitSale: boolean
  unitsPerPackage?: number
  boxBuyingPrice?: number
  bulkSellingPrice?: number
  groupPrices?: GroupPrice[]
  distributorName?: string
  distributorPhone?: string
  expiryDate?: string
  isActive: boolean
}

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  displayOrder: number
}

interface StockMovement {
  id: string
  productId: string
  type: 'adjustment' | 'sale' | 'purchase' | 'return' | 'transfer'
  quantity: number
  balanceAfter: number
  reason?: string
  referenceId?: string
  createdAt: string
}
```

## Database Tables

- `products` — full product schema with pricing, stock, metadata (JSON for group_prices)
- `categories` — product categories with color and icon
- `product_variants` — variant-level pricing and stock
- `stock_movements` — audit trail for all stock changes
- `stock_adjustment_log` — detailed adjustment records with before/after quantities

## Features

- **Category management**: create, edit, delete categories with color and icon
- **Product variants**: parent-variant relationship for size/color variations
- **Barcode generation**: auto-generate barcode if product has no barcode
- **Group pricing**: multiple price tiers per product (min qty + price)
- **Bulk pricing**: box buying price, bulk selling price, units per package
- **Expiry tracking**: optional expiry date per product
- **Low stock alerts**: threshold per product; flagged in UI when below
- **Stock movement audit**: every stock change logged with reason and balance after

## Notes

- Inventory page is UI-only; all business logic in `useDatabase` hooks and IPC handlers
- Stock is never set directly — always adjusted via `adjustStock` which writes the audit trail
- Barcode lookup is case-insensitive and trims whitespace
- Product search uses LIKE query across name, sku, and barcode
