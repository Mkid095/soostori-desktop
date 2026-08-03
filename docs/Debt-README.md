# Debt — Customer Debt Management

## Purpose

The Debt module tracks customer debts arising from credit sales. It records the original sale amount, manages partial payments, and provides a summary dashboard of total outstanding debt.

## Architecture

```
Credit sale → Create debt record → Track payments → Update status (pending/partial/paid)
```

### Key Flows

**Record Debt:**
```
Complete sale → Customer cannot pay full amount → Create debt (amount = totalAmount - paidAmount)
```

**Record Payment:**
```
Select debt → Enter payment amount → Select method (cash/card/transfer/mobile_money) → Save
  → Updates debts.amountPaid
  → If amountPaid >= amount → status = 'paid'
  → Else → status = 'partial'
  → Inserts debt_payments record
```

**Debt Summary:**
```
getDebtSummary() → Returns { total: sum of outstanding, count: number of debts }
```

## Data Flow

```
Renderer (DebtManagement.tsx)
  │  useDatabase hooks (getDebts, createDebt, recordDebtPayment, getDebtSummary)
  │  window.electronAPI.db.*
  ▼
Preload (preload.ts)
  │  ipcRenderer.invoke('db:debts:...')
  ▼
Main Process — IPC handlers (database-handlers.ts)
  │  SQLite via better-sqlite3
  ▼
soostori.db — debts, debt_payments, customers, sales tables
```

## Main Files

| File | Responsibility |
|------|---------------|
| `src/pages/DebtManagement.tsx` | Debt management UI — debt list, payment modal, summary cards |
| `src/lib/types.ts` | Debt, DebtPayment, Customer types |
| `src/hooks/useDatabase.ts` | Hooks: useDebts, useCreateDebt, useRecordDebtPayment, useDebtSummary |
| `electron/ipc-handlers/database-handlers.ts` | IPC handlers for debt CRUD, payment recording, summary |
| `electron/database/index.ts` | SQLite schema for debts, debt_payments, customers |

## Key Types

```typescript
interface Debt {
  id: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  saleId?: string
  amount: number       // Original debt amount
  amountPaid: number   // Total paid so far
  status: 'pending' | 'partial' | 'paid'
  dueDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  payments?: DebtPayment[]
}

interface DebtPayment {
  id: string
  debtId: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  createdAt: string
}

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
}
```

## Database Tables

- `customers` — customer records (name, phone, email, address)
- `debts` — debt header (amount, amountPaid, status, dueDate)
- `debt_payments` — individual payment records against a debt

## Status Transitions

```
pending → partial (when amountPaid > 0 but < amount)
partial → paid (when amountPaid >= amount)
Any status can be manually adjusted in settings
```

## Features

- **Debt creation**: linked to a sale or standalone
- **Customer linkage**: optional customerId for tracking who owes
- **Partial payments**: multiple payments until fully paid
- **Payment methods**: cash, card, transfer, mobile_money
- **Due date**: optional due date for tracking overdue
- **Notes**: free-text notes per debt
- **Summary dashboard**: total outstanding, count of active debts

## Notes

- Debt page is UI-only; all logic in hooks and IPC handlers
- A debt can exist without a customer (anonymous debt)
- A debt can be linked to a sale for reference
- Payment recording atomically updates amountPaid and status
