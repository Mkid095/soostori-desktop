# Reports — Sales Analytics

## Purpose

The Reports module provides sales analytics: daily/weekly/monthly revenue, transaction counts, top-selling products, and payment method breakdown. All data is queried from the local SQLite database.

## Architecture

```
Sales data (SQLite) → Date range filter → Aggregation → Chart render
```

### Key Flows

**Sales History:**
```
Select date range → getSalesByDateRange(start, end) → Display sales list
```

**Revenue Analytics:**
```
Select period (today/week/month/custom) → Aggregate sales.totalAmount → Render charts
```

## Data Flow

```
Renderer (SalesReports.tsx)
  │  useDatabase hooks (getSales, getSalesByDateRange)
  │  window.electronAPI.db.*
  ▼
Preload (preload.ts)
  │  ipcRenderer.invoke('db:sales:list', 'db:sales:listByDateRange')
  ▼
Main Process — IPC handlers (database-handlers.ts)
  │  SQLite: SELECT * FROM sales WHERE created_at BETWEEN ? AND ?
  ▼
soostori.db — sales, sale_items tables
```

## Main Files

| File | Responsibility |
|------|---------------|
| `src/pages/SalesReports.tsx` | Reports page UI — date pickers, charts, sales table |
| `src/lib/types.ts` | Sale, SaleItem types |
| `src/hooks/useDatabase.ts` | Hooks: useSales, useSalesByDateRange |
| `electron/ipc-handlers/database-handlers.ts` | IPC handlers for sales queries |

## Key Types

```typescript
interface Sale {
  id: string
  type: 'retail' | 'wholesale' | 'order'
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mobile_money'
  note?: string
  createdAt: string
  items?: SaleItem[]
}

interface SaleItem {
  id: string
  saleId: string
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}
```

## Charts & Analytics

Using **Recharts** library:

- **Revenue over time**: Line/Bar chart — totalAmount grouped by day/week/month
- **Payment method breakdown**: Pie/Donut chart — sales grouped by paymentMethod
- **Top products**: Bar chart — sum of sale_items.quantity grouped by productName
- **Daily transaction count**: Line chart — count of sales per day

## Date Range Handling

- Preset ranges: Today, This Week, This Month, Last 7 Days, Last 30 Days
- Custom range: date picker start + end
- All dates stored as ISO strings in SQLite; queries filter on `created_at`

## Database Tables

- `sales` — sale header with totals and payment method
- `sale_items` — line items; joined for product-level analytics

## Notes

- Reports page is UI-only; aggregation logic can be pushed to SQL for performance as dataset grows
- Currency formatting uses shop settings (KES) from `shop_settings` table
- Refunded/cancelled sales are excluded from revenue totals but shown in transaction counts
