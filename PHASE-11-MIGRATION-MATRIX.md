# Phase 11.0 — SDK Consumer Migration Matrix

> Status: **INVENTORY ONLY — No code changes.**

---

## SDK Package Inventory (`soostori-sdk`)

| Package | Key Exports | Target |
|---------|------------|--------|
| `@soostori/core` | Branded IDs (`UserId`, `ShopId`, `DeviceId`, `UUID`, `Money`), domain types (`User`, `Company`, `Shop`, `Employee`, `Device`, `Product`, `Sale`, `AuthSession`, `SyncEvent`, etc.), error classes | Universal |
| `@soostori/auth` | `IdentityContext`, `identityReducer`, `buildSession`, `isValidChain`, `nextRequiredLink`, `SessionStorage` interface, `hashPin`/`verifyPin`, `ROLE_PERMISSIONS`, `hasPermission` | Universal |
| `@soostori/business` | `Person`, `Business`, `Membership` types, `BusinessRepository`, `BusinessService` | Universal |
| `@soostori/devices` | `Device` types, `PrimaryDeviceCoordinator`, `DevicesRepository` | Universal |
| `@soostori/events` | Event catalog (`SALE_PENDING`, `STOCK_RECEIVED`, etc.), `SoostoriEvent`, `EventBus`, `createEvent`, `getEventBus` | Universal |
| `@soostori/inventory` | `StockMovement`, `StockBalance`, `StockReservation`, `InventoryRepository`, `StockMovementLedger` (`apply`, `reserve`, `commitReservation`, `releaseReservation`, `getQuantity`, `getHistory`) | Universal |
| `@soostori/storage` | `Repository<T>`, `TransactionHandle` interfaces — abstract | Universal |
| `@soostori/cloud` | `CloudClient` (`sendMagicCode`, `verifyMagicCode`, `signOut`, `query`, `transact`, `upsert`, `getById`, `health`), `createCloudClient` | Universal (uses `globalThis.fetch`) |
| `@soostori/schema` | `cloudEntities` registry, `FieldDef`, `EntitySchema`, `getEntitySchema`, `validateEntity` | Universal |
| `@soostori/sync` | `SyncEngine` (`publish`, `pushPending`, `pullSinceCursor`, `detectConflict`, `canMutateStock`, `getPrimaryState`), `OfflineQueue` (`add`, `getPending`, `markSent`, `markFailed`, `purge`), `QueueStorage`, `STOCK_SENSITIVE_EVENTS`, `downloadInitialSnapshot`, `buildBackupSnapshot` | Universal |
| `@soostori/offline` | `OfflinePhase` (`ONLINE`/`OFFLINE_NORMAL`/`OFFLINE_WARNING`/`OFFLINE_LIMIT_EXCEEDED`), `computeOfflineState`, 3-day grace policy | Universal |
| `@soostori/tuma` | `TumaClient` (`stkPush`, `createProduct`, `createSale`, `createInvoice`, `listBusinesses`, `getBusiness`), `createTumaClient` | Universal (uses `globalThis.fetch`) |
| `@soostori/payments` | `PaymentProvider` interface, `PaymentProviderRegistry`, payment types (`StkPushRequest`, `StkPushResult`, etc.) | Universal |
| `@soostori/whatsapp` | `EvolutionClient`, `WhatsAppChannel` (implements `NotificationChannel`), webhook handler | Universal |
| `@soostori/notifications` | `NotificationChannel` interface, `NotificationEngine`, `RecipientResolver`, `defaultChannelsFor` | Universal |
| `@soostori/audit` | `AuditEntry`, `AuditStorage`, `AuditRecorder` | Universal |
| `@soostori/subscription` | `Plan`, `Subscription`, `CachedEntitlement`, `computeState`, `isStatusActive`, `nextVerificationDeadline` | Universal |
| `@soostori/lan` | `TerminalClient`, `LANServer`, message types, host election | Universal (uses `ws`) |
| `@soostori/desktop-adapter` | **Private** — `DesktopSalesRepository`, `ProductsRepository`, `DesktopInventoryRepository`, `DesktopDevicesRepository`, `DesktopBusinessRepository`, `SqliteRepository`, `SqliteTransactionHandle`, PIN helpers | Desktop/Node only |
| `@soostori/contracts` | Zod schemas (sales-portal only currently) | Universal |

---

## Domain Migration Matrix

| Domain | SDK Canonical | Desktop | Mobile | Web | Status |
|--------|--------------|---------|--------|----|---------|
| **Core types** | `@soostori/core` | ✅ Full | ✅ Imports | 🔍 Blocked | OK |
| **Auth** | `@soostori/auth` | Partial (SessionStorage, PIN) | **Zero SDK** | 🔍 Blocked | Gap |
| **Business** | `@soostori/business` | **Unused** | **Zero SDK** | 🔍 Blocked | Gap |
| **Devices** | `@soostori/devices` | **Zero SDK** (custom SQL polling) | Custom | 🔍 Blocked | Gap |
| **Events** | `@soostori/events` | **Unused** | **Unused** | 🔍 Blocked | Gap |
| **Inventory** | `@soostori/inventory` | ✅ Full (`StockMovementLedger`) | **Zero SDK** (flat append, no idempotency keys) | 🔍 Blocked | Gap |
| **Sales** | `@soostori/sales` (via @soostori/desktop-adapter) | ✅ Full (`SalesService`) | Custom | 🔍 Blocked | Gap |
| **Customers** | (planned) | **Unused** | Custom | 🔍 Blocked | Gap |
| **Debts** | (planned) | **Unused** | Custom | 🔍 Blocked | Gap |
| **Sync** | `@soostori/sync` | Partial (LAN WS only) | Two systems (LAN + cloud) | 🔍 Blocked | Gap |
| **Offline** | `@soostori/offline` | **Unused** | Custom | 🔍 Blocked | Gap |
| **Subscription** | `@soostori/subscription` | **Unused** | Custom | 🔍 Blocked | Gap |
| **Storage** | `@soostori/storage` | Direct SQLite | Direct expo-sqlite | 🔍 Blocked | Gap |
| **Notifications** | `@soostori/notifications` | **Unused** | **Unused** | 🔍 Blocked | Gap |
| **Payments** | `@soostori/tuma` / `@soostori/payments` | Custom | Custom | 🔍 Blocked | Gap |

> Note: `@soostori/products`, `@soostori/customers`, `@soostori/debts` packages are **referenced in architecture** but not confirmed in the SDK package inventory. They may be sub-packages of `@soostori/business` or planned.

---

## Desktop (soostori-desktop) — Consumer Inventory

### SDK Packages Used

| Package | Used Via | Location |
|---------|---------|----------|
| `@soostori/core` | Direct | `electron/sdk/*.ts`, `electron/ipc-handlers/*.ts` |
| `@soostori/desktop-adapter` | Direct | `electron/sdk/*.ts` |
| `@soostori/sales` | Direct | `electron/sdk/sale-orchestrator.ts` |
| `@soostori/inventory` | Direct | `electron/sdk/inventory-orchestrator.ts` |
| `@soostori/auth` | SessionStorage only | `electron/auth/electron-store-session.ts` |

### Gaps in Desktop

| Gap | Evidence | Severity |
|-----|---------|-----------|
| Duplicate `getPrimaryStatus()` | `electron/sdk/sale-orchestrator.ts:38` + `electron/sdk/inventory-orchestrator.ts:32` — identical logic, same thresholds | P1 |
| `PrimaryDeviceCoordinator` unused | Desktop has custom polling instead of `@soostori/devices` | P1 |
| `@soustori/business` unused | Custom SQL for shop/employee | P2 |
| `@soostori/events` unused | Custom timers/polling instead of event bus | P2 |
| Cloud auth bypasses `@soostori/auth` identity | `electron/services/cloud-auth.ts` custom REST | P1 |
| `BusinessRepository` unused | Custom SQL in `cloud-auth-sync.ts` | P2 |

---

## Mobile (soostori-mobile) — Consumer Inventory

### SDK Packages Used

**Zero `@soostori/*` imports found.** Mobile implements all business logic custom.

### Custom Implementations (must be replaced)

| Domain | File | Notes |
|--------|------|-------|
| Auth | `src/services/db-employees.ts` | PBKDF2 via Web Crypto |
| Session | `src/core/auth.ts` | AsyncStorage key/values |
| Inventory | `src/services/db-inventory-transactions.ts` | Flat append, no idempotency keys |
| Sales | `src/services/db-sales.ts` | Custom pending/confirm/reject flow |
| Customers | `src/services/db-customers.ts` | Direct SQL |
| Sync queue | `src/services/sync-queue-helper.ts` | Custom retry logic |
| LAN sync | `src/services/lan-client.ts` | Custom WebSocket protocol |
| Cloud sync | `src/services/cloud-sync-api.ts` | Custom InstantDB wrapper |

### Mobile Schema vs SDK Contract

Mobile `inventory_transactions` MISSING columns required by `@soostori/inventory`:
- `idempotency_key` — NOT NULL
- `actor_type` — NOT NULL
- `actor_id` — NOT NULL
- `sequence_number` — NOT NULL

### Mobile Gaps Ranked

| Gap | Severity | Blocking? |
|-----|-----------|------------|
| No `@soostori/auth` SessionStorage adapter | P0 | Yes |
| No `@soostori/inventory` InventoryRepository | P0 | Yes |
| No idempotency keys in schema | P0 | Yes |
| Two competing sync systems (LAN + cloud) | P1 | Yes |
| No `@soostori/business` consumption | P1 | No |
| No `@soostori/events` usage | P2 | No |

---

## Web (soostori) — Consumer Inventory

**Verified location:** `C:/Users/Administrator/Documents/GitHub/soostori/`
- Workspaces: `db`, `shared`, `packages/contracts`, `frontend`, `backend`
- The `packages/contracts/` is a **local Web package** (not the SDK's `@soostori/contracts`)
- Web's `frontend/package.json` and `backend/package.json` contain **zero `@soostori/*` imports**

### Web's Local Architecture

| Layer | Tech |
|-------|------|
| Frontend | Vite/React |
| Backend | Next.js (API routes) |
| Database | Prisma |
| Cloud | `@instantdb/core` + `@instantdb/react` |
| Contracts | Local `packages/contracts/` (Zod schemas) |

### Web Gaps Ranked (preliminary, needs deeper audit)

| Gap | Severity | Blocking? |
|-----|-----------|------------|
| `@soostori/auth` zero consumption | P0 | Yes |
| Raw REST replacing SDK service classes | P1 | Yes |
| Custom business model vs SDK hierarchical | P1 | Yes |
| Custom M-Pesa integration vs `@soostori/tuma` | P2 | No |
| `@instantdb` vs SDK cloud abstraction | P2 | No |

**Action required:** Re-run Web audit with correct path before Phase 11.6 / 11.7.

---

## Platform Adapter Map

```
@soostori/* SDK contracts (universal)
        │
        ├── Desktop: @soostori/desktop-adapter → better-sqlite3 (✅ exists)
        ├── Mobile: @soostori/mobile-adapter → expo-sqlite + AsyncStorage  ← DOES NOT EXIST YET
        └── Web: @soostori/web-adapter → REST/Prisma        ← BLOCKED: directory not found
```

---

## Proposed Phase 11 Sub-Phase Order

```
11.0  Migration matrix + audit (THIS DOCUMENT)              ✅ DONE
        │
11.1  Platform adapter foundations
        ├── Desktop: deduplicate getPrimaryStatus() → @soostori/devices
        ├── Mobile: SessionStorage adapter (@soostori/auth → AsyncStorage)
        ├── Mobile: InventoryRepository adapter (expo-sqlite)
        └── Mobile: Schema migration (add idempotency_key, actor_type, actor_id, sequence_number)
        │
11.2  Desktop canonicalization
        ├── @soostori/devices PrimaryDeviceCoordinator wiring
        ├── @soostori/business BusinessService wiring
        └── @soostori/events event bus integration
        │
11.3  Mobile commerce migration (inventory → sales → products → customers → debts)
        │
11.4  Mobile sync unification (LAN + cloud → @soostori/sync)
        │
11.5  Web discovery (BLOCKED until soostori-web directory found)
        │
11.6  Web auth/identity migration (depends on 11.5)
        │
11.7  Web business/service migration
        │
11.8  Cross-platform contract tests
        │
11.9  Full three-platform regression
```

---

## Recommended Next Action

**Web directory located** at `C:/Users/Administrator/Documents/GitHub/soostori/`. Verified zero `@soostori/*` consumption in Web.

**Suggested sequencing:**
1. **Phase 11.1** can proceed now — Desktop dedup + Mobile adapters (independent of Web)
2. **Phase 11.5-11.7** (Web) needs a fresh, deeper audit before migration begins
3. **Phase 11.8** (cross-platform tests) blocked until Web audit completes

---

## Blocker Priority

### P0 — Cannot migrate any domain without resolving

| Blocker | Affects |
|---------|---------|
| Mobile has no `@soostori/auth` SessionStorage adapter | Auth, all domains |
| Mobile `inventory_transactions` missing canonical columns | Inventory, Sales |
| Mobile has two competing sync systems | Sync, all domains |
| Web backend `@soostori/auth` completely unused | Auth, all domains |
| Mobile `@soostori/business` zero consumption | Business, all domains |

### P1 — Should resolve before broad migration

| Gap | Risk |
|-----|------|
| Desktop `getPrimaryStatus()` duplicated | Divergence |
| Desktop cloud-auth bypasses SDK identity | Auth regression |
| Mobile `@soostori/events` zero consumption | Events migration will break offline |
| Web business model flat vs SDK hierarchical | Business migration complex |
| Web REST calls bypass SDK service contracts | Multi-platform divergence |

---

## Schema Delta — Mobile inventory_transactions

```sql
-- Mobile current (missing columns):
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  product_id TEXT NOT NULL,
  device_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
)

-- SDK requires (canonical):
  idempotency_key TEXT NOT NULL
  actor_type TEXT NOT NULL       -- 'device' | 'user' | 'cloud'
  actor_id TEXT NOT NULL
  sequence_number INTEGER NOT NULL  -- monotonic per product
```

---

## Blocker Resolution First Principle

> **Never migrate a domain while its storage adapter has P0 gaps.**
> Resolve P0s in 11.1 before touching any domain logic in Mobile.
> Resolve P1s in 11.2 before removing legacy Desktop business logic.

---

## P0 Specific: Mobile SessionStorage Adapter

`@soostori/auth` defines `SessionStorage`:

```typescript
interface SessionStorage {
  load(): Promise<AuthSession | null>
  save(session: AuthSession): Promise<void>
  clear(): Promise<void>
}
}
```

Mobile would implement:

```typescript
// Pseudocode — actual implementation in 11.1
class AsyncStorageSessionAdapter implements SessionStorage {
  async load() { /* AsyncStorage.getItem('soostori:session') */ }
  async save(session) { /* AsyncStorage.setItem('soostori:session', JSON.stringify(session) */ }
  async clear() { /* AsyncStorage.removeItem('soostori:session') */ }
}
```

Same adapter pattern for `@soostori/inventory` InventoryRepository over expo-sqlite.
