# Soostori Desktop — Product Vision

**Document status:** Architecture baseline  
**Product:** Soostori Desktop — Hardware-capable POS client  
**Role in ecosystem:** Primary point-of-sale interface for inventory-based businesses  
**Platform:** Electron (Windows/macOS/Linux)

---

## 1. Executive Summary

Soostori Desktop is the **hardware-capable point-of-sale client** of the Soostori Business Platform. It is the interface where products are sold, inventory is managed on the floor, and peripherals are integrated.

> **Core promise:** Run fast, reliable sales operations at the till — with or without internet — while staying synchronized with the rest of the business.

Desktop is one of two POS clients (the other being Soostori Mobile). Both share the same business contracts through the SDK layer, but Desktop implements hardware integrations that Mobile cannot.

---

## 2. Desktop's Position in the Soostori Ecosystem

```
                         SOOSTORI
                            │
       ┌───────────────────┼───────────────────┐
       │                                       │
  BUSINESS PLATFORM                       PARTNER PLATFORM
       │                                       │
       │                                  Web-only
       │                                  admin portal
       │
  ┌────┴────┐
  │         │
Desktop    Mobile
  │         │
Hardware   Camera
Periph.    barcode
```

**Desktop is the till.** It is where the cashier stands, the receipt prints, the scanner fires, and the cash drawer opens.

---

## 3. What Desktop Is Responsible For

### 3.1 POS Operations

- High-speed barcode scanning and product lookup
- Cart management (add, remove, adjust quantities, apply discounts)
- Sale completion (cash, mobile money, card, transfer, debt)
- Held/suspended sales (save cart for later)
- Sale refunds and returns
- Multi-item transactions with per-item pricing

### 3.2 Hardware Integration

Desktop owns hardware that the other clients cannot:

| Hardware | Desktop Responsibility |
|---|---|
| Barcode scanner (keyboard wedge) | Works by default — keystrokes routed to active input |
| Barcode scanner (serial/USB serial) | Configure port + baud in Settings |
| Receipt printer (ESC/POS) | Print receipts, reprints from history |
| Cash drawer | Open via printer command on sale complete |
| Customer display | Show running total, product name on second screen |
| Label printer | Print product/price labels |
| POS terminal | Capture card payment confirmation |
| Weighing scale | Read weight for quantity-based sales |

### 3.3 Local LAN Synchronization

Desktop participates in the Primary Device hierarchy:

```
                    CLOUD
                       │
                 Internet Sync
                       │
                 PRIMARY DEVICE
                 (one per shop)
                       │
                  Local LAN
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           Till 1   Till 2   Mobile
```

- The **host** Desktop instance acts as the LAN sync authority
- The **client** Desktop instance sends pending sales to the host for processing
- All devices share the same business data over LAN without internet
- Conflict resolution: host is the single authority; conflicts cannot occur because the host serializes all mutations

### 3.4 Offline Operation

- All POS operations work from local SQLite when internet is unavailable
- Up to **3 days** of full offline operation permitted
- After 3 days offline, mutations are blocked until reconnected
- Offline entitlement enforced by the subscription state machine

### 3.5 Business Context

Desktop operates within a defined business context:

- Each Desktop instance is registered to one shop/business
- A shop has one active subscription
- Users authenticate with PIN; each user has a role (owner, manager, cashier)
- RBAC enforced at both the UI layer and the IPC/service layer — hiding a button is NOT security

---

## 4. What Desktop Is NOT Responsible For

These are handled by other products or platform services:

| Concern | Owner |
|---|---|
| Business creation and enrollment | Soostori Partner Platform (Web) |
| Subscription management and billing | Soostori Partner Platform (Web) |
| Commission calculation | Soostori Partner Platform (Web) |
| Salesperson/influencer management | Soostori Partner Platform (Web) |
| Multi-shop owner dashboard | Soostori Business Web (Web) |
| Mobile POS (camera barcode, no peripherals) | Soostori Mobile |
| Cloud push/pull for non-POS entities | Soostori Platform Services |
| WhatsApp and external notifications | Soostori Platform Services |
| Customer-facing web store | Soostori Business Web (future) |

---

## 5. The Sale Flow — Desktop's Core Job

This is the primary user journey Desktop must execute flawlessly:

```
CASHIER SCANS BARCODE
         │
         ▼
  PRODUCT LOOKUP (local SQLite)
         │
         ▼
  ADD TO CART (cart_items state)
         │
         ▼
  MORE ITEMS? ──YES──► [continue]
         │NO
         ▼
  SELECT PAYMENT METHOD
  (cash / mobile / card / transfer / debt)
         │
         ▼
  "COMPLETE SALE" CLICKED
         │
         ▼
  IPC: db:sales:create
         │
    ┌────┴────┐
    │ Session  │
    │ loaded   │
    │ RBAC     │
    │ checked  │
    └────┬────┘
         │
         ▼
  commitSale() ──► SDK orchestrator
         │
         ▼
  DesktopSalesRepository
         │
    ┌────┴────┐
    │ Canonical │
    │ ledger    │
    │ apply()   │
    └────┬────┘
         │
         ▼
  SQLite: sale INSERT
         │
         ▼
  SQLite: sale_items INSERT
         │
         ▼
  SQLite: stock_movements INSERT
         │
         ▼
  SQLite: products.current_stock UPDATE
         │
         ▼
  [if debt] debts INSERT
         │
         ▼
  Audit log INSERT (sale_completed)
         │
         ▼
  cloud-entity-sync: pushSale() [async]
         │
         ▼
  [if low stock] notification:low-stock
         │
         ▼
  [if ESC/POS] print receipt
         │
         ▼
  [if cash drawer] open drawer
         │
         ▼
  UI: cart cleared, success shown
```

---

## 6. Offline-First Architecture

### 6.1 Local Database (SQLite)

- **Source of truth** during offline operation
- All reads go to SQLite first
- All writes go to SQLite and the sync queue
- WAL mode for concurrent reads during active sales

### 6.2 Sync Queue

Every mutation produces a queued operation:

```
Local write ──► Sync queue ──► [when online] ──► Cloud
```

If the device is offline, operations accumulate in the queue. When connectivity returns, the queue is flushed in order.

### 6.3 Three-Day Offline Policy

```
ONLINE
  │
  │ Internet lost
  ▼
OFFLINE DAY 1 ──── Normal operation
  │
OFFLINE DAY 2 ──── Normal operation
  │
OFFLINE DAY 3 ──── Warning shown in header
  │
  │ Day 4+
  ▼
MUTATIONS BLOCKED ──── "Connection required to continue"
```

Enforcement: subscription state machine in the SDK layer, not in the UI.

### 6.4 Reconnection

```
Internet returns
       │
       ▼
Sync queue flushed to cloud
       │
       ▼
Cloud changes pulled
       │
       ▼
Local state reconciled
       │
       ▼
Normal operation resumes
       │
       ▼
Header badge: 🟢 ONLINE
```

---

## 7. LAN Synchronization

### 7.1 Host Mode

When Desktop is the Primary Device (host):

```
LAN client sale request
       │
       ▼
WebSocket message received
       │
       ▼
Sale validated (stock check)
       │
       ▼
commitSale() executed locally
       │
       ▼
Result sent back to client
       │
       ▼
Client updates local state
```

### 7.2 Client Mode

When Desktop is a secondary till:

```
Cashier completes sale
       │
       ▼
Sale sent to host via LAN
       │
       ▼
UI shows "Pending..." (sale not yet confirmed)
       │
       ▼
Host processes, responds
       │
       ▼
Client receives confirmation
       │
       ▼
Sale confirmed in local DB
       │
       ▼
UI updates to "Completed"
```

### 7.3 Primary Device Heartbeat

- Host emits heartbeat every 30 seconds
- Clients track last-seen timestamp
- If heartbeat missed for >60s, client shows 🟡 "Host unavailable" badge
- Client can still operate from local cache but new sales go to pending queue

---

## 8. RBAC in Desktop

Roles and their POS permissions:

| Action | Owner | Manager | Cashier |
|---|---|---|---|
| Complete sale | ✅ | ✅ | ✅ |
| Refund sale | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | Limited |
| Create/edit products | ✅ | ✅ | ❌ |
| Adjust stock | ✅ | ✅ | ❌ |
| Create/edit customers | ✅ | ✅ | ✅ |
| Delete customer | ✅ | ✅ | ❌ |
| Record debt payment | ✅ | ✅ | ✅ |
| Create debt | ✅ | ✅ | ✅ |
| Manage team | ✅ | ✅ | ❌ |
| View audit log | ✅ | ✅ | ❌ |
| Change settings | ✅ | ✅ | ❌ |
| Refund without receipt | ✅ | ❌ | ❌ |

**Enforcement:** Every mutation IPC handler loads the session and calls `hasPermission(role, permission)` before executing. This is NOT optional and NOT enforceable only at the UI layer.

---

## 9. Hardware Configuration

### 9.1 Settings Panel

Hardware settings live in **Settings → Hardware**:

- Scanner type: keyboard wedge / serial
- Serial port: COM1, COM2, ... (if serial selected)
- Baud rate: 9600, 19200, 38400, 115200
- Receipt printer: ESC/POS over USB/serial
- Cash drawer: via printer (ESC/POS open command)
- Customer display: USB/Virtual COM

### 9.2 Receipt Printing

- ESC/POS commands sent directly to configured port
- Receipt format: shop name, items, totals, payment method, timestamp, receipt number
- Reprint from sale history (Settings → Reports → Sale Detail → Print)

### 9.3 Customer Display

- Second screen shows: running total, last added item name, payment method prompt
- Updates on every cart change

---

## 10. Event Pipeline

Desktop emits platform events for important operations:

| Event | Triggered When |
|---|---|
| `SALE_COMPLETED` | Sale committed successfully |
| `SALE_REFUNDED` | Refund processed |
| `STOCK_LOW` | `products.current_stock <= low_stock_threshold` |
| `STOCK_OUT` | `products.current_stock = 0` |
| `DEBT_CREATED` | Debt recorded against a customer |
| `DEVICE_ONLINE` | Device heartbeat restored |
| `DEVICE_OFFLINE` | Device heartbeat lost |
| `PRIMARY_DEVICE_STALE` | Host heartbeat missed >60s |
| `OFFLINE_LIMIT_WARNING` | Day 3 of offline operation |
| `OFFLINE_LIMIT_EXCEEDED` | Day 4+ offline |

Platform services (notification, audit, sync) subscribe to these events.

---

## 11. Data That Lives on Desktop

Desktop owns and is the authoritative source for:

- `products` — product catalog with stock levels
- `categories` — product categories
- `sales` — completed sale transactions
- `sale_items` — individual items per sale
- `held_sales` — suspended carts
- `stock_movements` — canonical inventory ledger (signed deltas)
- `customers` — customer records
- `debts` — debt records
- `debt_payments` — debt payment history
- `employees` — team members and PIN hashes
- `devices` — registered devices including this one
- `sync_queue` — pending operations awaiting sync
- `audit_logs` — local audit trail

Cloud sync: Desktop pushes `products`, `sales`, `customers`, `categories`, `expenses`. Cloud pulls/reconciles.

---

## 12. What Desktop Shares With Mobile

Both POS clients consume the same SDK contracts:

| Domain | Shared Via |
|---|---|
| Product models | `@soostori/products` |
| Inventory ledger | `@soostori/inventory` |
| Sales logic | `@soostori/sales` |
| Customer model | `@soostori/customers` |
| Debt model | `@soostori/debts` |
| Auth/session | `@soostori/auth` |
| RBAC | `@soostori/permissions` |
| Offline state | `@soostori/offline` |
| Sync engine | `@soostori/sync` |
| Device identity | `@soostori/devices` |
| Subscription entitlement | `@soostori/subscriptions` |
| Audit | `@soostori/audit` |
| Notifications | `@soostori/notifications` |

Desktop and Mobile must NOT implement business logic independently. Both call the SDK. The SDK is the business logic layer.

---

## 13. UX Principles for Desktop

### 13.1 Speed Is Paramount

- Every interaction < 100ms response at the till
- Barcode scan → product added to cart in < 50ms (local SQLite)
- Sale completion feedback in < 200ms (including receipt command)

### 13.2 Offline Is Invisible

- The cashier should not need to know or care whether internet is available
- Header badge shows status but does not interrupt workflow
- Only when mutations are blocked should the UI force awareness

### 13.3 Hardware Failures Are Graceful

- Printer not connected → show on-screen receipt, allow manual print
- Scanner disconnected → fall back to manual barcode entry
- Cash drawer fails → sale completes normally, drawer alert shown

### 13.4 Confirmation for Destructive Actions

- Refund → confirmation dialog with amount and reason
- Delete product with stock → confirmation required
- Clear cart with items → confirmation required

### 13.5 No AI Visual Vocabulary

- No sparkle icons, magic wands, robot faces, neural node decorations
- Use Lucide icons exclusively
- Status indicators: colored dots (green/amber/red), no animated orbs
- Reserve ✨ only for actual AI-assisted features

---

## 14. Application Structure

```
soostori-desktop/
├── electron/                    # Main process
│   ├── main.ts                 # App entry, window, IPC registration
│   ├── preload.ts              # Secure contextBridge API
│   ├── database/               # SQLite schema + migrations
│   ├── auth/                   # Session management (electron-store)
│   ├── sdk/                    # SDK adapter layer
│   ├── ipc-handlers/           # All IPC mutation/query handlers
│   ├── services/               # Cloud sync, canonical services
│   ├── sync/                   # LAN sync, Primary Device coordinator
│   └── hardware/               # ESC/POS printer, serial scanner
│
├── src/                        # Renderer process (React)
│   ├── App.tsx                 # Root layout, sidebar, header
│   ├── pages/
│   │   ├── POS.tsx             # Point of Sale — cart + checkout
│   │   ├── Inventory.tsx       # Product management
│   │   ├── Reports.tsx         # Sales reports, refunds
│   │   ├── TeamPage.tsx        # User management
│   │   ├── DevicesPage.tsx     # Device sync settings
│   │   └── Settings.tsx        # Hardware + shop configuration
│   ├── components/
│   │   ├── PrimaryStatusIndicator.tsx   # 🟢🟡🔴 header badge
│   │   ├── LoginScreen.tsx     # PIN login
│   │   └── SyncIndicator.tsx   # LAN/cloud sync status
│   ├── hooks/                  # React-Query wrappers over IPC
│   └── lib/                    # Type definitions, IPC bridge types
│
├── docs/
│   └── DESKTOP-VISION.md      # This document
│
└── CHANGELOG.md               # Updated on every change
```

**ANPAS rules (non-negotiable):**
- Max 150 lines per file
- `[domain]-[action]-[type].ts` naming — no `helpers.ts`, `utils.ts`, `common.ts`
- Business logic NEVER in React components — always in `electron/` services or SDK layer
- TypeScript strict — no `any`, no implicit `any`
- CHANGELOG.md updated on every commit

---

## 15. What's Next for Desktop

### Phase 1 — Lock Current Baseline ✅

- All 133 tests passing
- RBAC enforced at IPC layer
- Audit trail fires on sale completion
- Primary Device status visible in header
- Refund flow end-to-end
- Sale commit → cloud push

### Phase 2 — Complete Cloud Pull

Desktop currently pushes to cloud but does not pull received changes from web/mobile.

- Implement cloud polling/push receiver
- When products/sales/customers change on cloud, Desktop receives and reconciles
- This is the critical gap for multi-device consistency

### Phase 3 — Receipt Reprint

- Sale history → select sale → reprint receipt
- Requires storing last receipt data with each sale

### Phase 4 — Customer WhatsApp (via Notification Platform)

- Low-stock alert → notification event → WhatsApp via Evolution API
- Debt reminder → notification event → WhatsApp
- This goes through the notification SDK, not embedded in Desktop

### Phase 5 — LAN Failover / Device Election

- Controlled failover: owner/manager can designate a new Primary Device
- No automatic election (risk of split-brain inventory conflicts)
- Document the failover procedure

### Phase 6 — Full SDK Migration

- All business logic currently in `electron/` handlers moves to SDK calls
- Desktop becomes a thin UI + hardware adapter over the SDK layer
- Mobile and Desktop share identical business behavior through shared SDK contracts

---

## 16. What Desktop Does NOT Need (Yet)

| Feature | Reason to Defer |
|---|---|
| Customer self-registration | Enrolled by salesperson via Partner Platform |
| Supplier management UI | Phase 2 or later |
| Batch/expiry tracking | Not in core v1 scope |
| Variants management | Phase 2 |
| Multi-warehouse | Not in core v1 scope |
| Customer-facing display | Separate hardware concern |
| QR code payments | M-Pesa integration is separate |
| Employee attendance/time tracking | HR module, not POS |
| Purchase orders | Different domain from POS sales |

---

## 17. Relationship to SDK Agent Work

Desktop depends on the SDK packages being correct and complete. The SDK Agent owns:

- `@soostori/core` — IDs, types, primitives
- `@soostori/auth` — PIN hash, verify, session, `hasPermission`
- `@soostori/business` — business context, shop identity
- `@soostori/products` — product repository interface
- `@soostori/inventory` — `StockMovementLedger`, `adjustStock`
- `@soostori/sales` — `commitSale`, sale repository
- `@soostori/customers` — customer repository
- `@soostori/debts` — debt repository
- `@soostori/offline` — offline state machine, grace period
- `@soostori/sync` — sync engine, event queue
- `@soostori/devices` — `PrimaryDeviceCoordinator`
- `@soostori/subscriptions` — entitlement checks
- `@soostori/audit` — `AuditRecorder`
- `@soostori/notifications` — `NotificationDispatcher`
- `@soostori/desktop-adapter` — SQLite adapter for SDK interfaces

Desktop's job is to:
1. Provide the best POS UX with hardware support
2. Correctly use the SDK interfaces (not reimplement business logic)
3. Report SDK gaps when found so they are fixed in the SDK, not patched in Desktop

**Rule:** SDK gaps are fixed in the SDK. Desktop does not locally patch SDK problems.
