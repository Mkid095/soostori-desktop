# POS — Point of Sale

## Purpose

The POS module handles the core sales transaction flow: barcode scanning, cart management, payment processing, receipt printing, and held sales persistence.

## Architecture

```
Barcode scan/input → Product lookup → Cart management → Checkout → Payment → Receipt print
```

### Key Flows

**Sale Flow:**
```
Barcode scan → Product lookup (by barcode) → Add to cart → Adjust qty → Checkout →
  → Record payment (cash/card/transfer/mobile_money) → Save sale to DB → Print receipt
```

**Held Sale Flow:**
```
Add items to cart → Save held sale (name optional) → Later: restore held sale → Complete checkout
```

## Data Flow

```
Renderer (POS.tsx)
  │  useDatabase hook (getProductByBarcode, createSale, getHeldSales, ...)
  │  window.electronAPI.db.*
  ▼
Preload (preload.ts) — contextBridge exposes electronAPI.db
  │  ipcRenderer.invoke('db:...')
  ▼
Main Process — IPC handlers (database-handlers.ts)
  │  SQLite via better-sqlite3
  ▼
soostori.db — sales, sale_items, held_sales tables
```

## Receipt Printing Flow

```
POS.tsx calls window.electronAPI.hw.printReceipt(receiptData)
  → preload.ts forwards via ipcRenderer.invoke('hw:printer:print', data)
  → hardware-handlers.ts receives it
  → printer.ts ESC/POS command builder formats bytes
  → Serial port writes raw bytes to printer
```

## Main Files

| File | Responsibility |
|------|---------------|
| `src/pages/POS.tsx` | POS page UI shell — renders cart, product search, checkout modal |
| `src/lib/types.ts` | CartItem, Sale, SaleItem, HeldSale, ReceiptData types |
| `src/hooks/useDatabase.ts` | React Query hooks: useProducts, useCreateSale, useHeldSales, useLookupBarcode |
| `electron/ipc-handlers/database-handlers.ts` | IPC handlers for sales CRUD, held sales, barcode lookup |
| `electron/hardware/printer.ts` | ESC/POS command builder: text formatting, cut, cash drawer |
| `electron/preload.ts` | Exposes db.sale.* and hw.printReceipt via contextBridge |

## Key Types

```typescript
interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  variationName?: string
}

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
  items?: SaleItem[]
}

interface ReceiptData {
  shopName: string
  receiptNumber: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  footerMessage?: string
}
```

## Database Tables

- `sales` — sale header (totals, payment, status)
- `sale_items` — individual line items per sale
- `held_sales` — persisted carts for later completion
- `products` — product catalog (stock decremented on sale)

## Payment Methods

Supported: cash, card, transfer, mobile_money

## Hardware Integration

- **Keyboard wedge scanner**: Barcode arrives as keyboard input; POS listens via input focus or global key capture
- **Serial scanner**: Configured in Settings; connects via SerialPort, emits barcodes to `hw:scanner:barcode` IPC event
- **ESC/POS printer**: Serial connection; receipt formatted as ESC/POS commands (bold, alignment, cut)

## Notes

- POS page (`src/pages/POS.tsx`) is the UI shell — business logic lives in hooks and electron main process
- Stock is decremented at checkout time via `adjustStock` IPC call, which also writes a `stock_movements` audit record
- Held sales persist the full cart JSON in `held_sales.cart_items`
