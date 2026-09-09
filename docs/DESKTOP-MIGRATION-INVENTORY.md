# Desktop Migration Inventory & Matrix

**Source:** `C:\Users\Administrator\Documents\GitHub\soostori-desktop`
**Total LOC to migrate:** ~4873 lines across IPC handlers, sync, services, database.

---

## Architecture Target

```
Renderer / UI (React)
       │
       ▼
Electron IPC (preload/handlers-db.ts)
       │
       ▼
Desktop Platform Adapters (electron/adapters/*)
       │
       ▼
@soostori/*  domain services + business logic
       │
       ▼
Repository interfaces (@soostori/storage Repository<T>)
       │
       ▼
Desktop SQLite implementation (electron/adapters/sqlite/*)
```

Electron must contain **no canonical business rules** after migration.

---

## A. IPC Handler Inventory (31 files)

### A1. Authentication / Employee (auth-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:auth:login` | Validates PIN hash, creates device session | `@soostori/auth` `login()` + `verifyPin()` | Desktop adapter creates UserSession |
| `db:auth:createUser` | Hashes PIN, creates employee | `@soostori/auth` `createUser()` | Desktop adapter persists Employee |
| `db:auth:logout` | Closes session | `@soostori/auth` `logout()` | Direct |
| `db:auth:updateUser` | Updates role/pin | `@soostori/auth` `updateUser()` | Desktop adapter |
| `db:auth:deleteUser` | Soft delete | `@soostori/auth` `deleteUser()` | Desktop adapter |

### A2. Shop / Person / Membership (shop-handlers.ts, business in services/)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:shop:get` | Reads shop by id | `@soostori/business` `BusinessService.find()` | Desktop adapter |
| `db:shop:create` | Creates shop + owner membership | `@soostori/business` `createBusiness()` | Desktop adapter |
| `db:shop:getUsers` | Lists employees | `@soostori/business` `getPersonMemberships()` | Desktop adapter |

### A3. Product (product-handlers*.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:products:list` | Lists products with category | `@soostori/products` `ProductService.findMany()` | Desktop adapter |
| `db:products:create` | Creates product | `@soostori/products` `ProductService.create()` | Desktop adapter |
| `db:products:update` | Updates product + emits `PRODUCT_UPDATED` event | `@soostori/products` `update()` + `@soostori/events` | Desktop adapter |
| `db:products:delete` | Soft deletes | `@soostori/products` `delete()` | Desktop adapter |
| `db:products:lookupBarcode` | Find by barcode | `@soostori/products` `findByBarcode()` | Desktop adapter |

### A4. Category (category-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:categories:list` | Lists categories | `@soostori/products` `ProductService.findCategories()` | Desktop adapter |
| `db:categories:create` | Creates category | `@soostori/products` `ProductService.createCategory()` | Desktop adapter |

### A5. Inventory (inventory-tx-handlers.ts, stock-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:inventory:txCreate` | Records inventory transaction | `@soostori/inventory` `StockMovementLedger.apply()` | Desktop adapter |
| `db:inventory:getBalance` | Returns balance | `@soostori/inventory` `StockMovementLedger.getQuantity()` | Desktop adapter |
| `db:inventory:getHistory` | Returns movements | `@soostori/inventory` `StockMovementLedger.getHistory()` | Desktop adapter |
| `db:stock:adjust` | Sets stock | `@soostori/inventory` `StockMovementLedger.apply({type:'adjusted'})` | Desktop adapter |
| `db:stock:movements` | Lists movements | `@soostori/inventory` | Desktop adapter |

### A6. Sales (sale-handlers-mutation.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:sales:create` | Creates sale + sale_items + stock updates | `@soostori/sales` `SalesService.commit()` + `@soostori/inventory` ledger | Desktop adapter — must route through Primary if available |
| `db:sales:list` | Lists sales | `@soostori/sales` repository | Desktop adapter |
| `db:sales:createSync` | Creates sync_sales record | `@soostori/sync` sync engine | Desktop adapter |
| `db:sales:updateSync` | Updates sync_sales status | `@soostori/sync` | Desktop adapter |

**Note:** Sale creation MUST go through `SalesService.authorize()` via Primary Device for stock-sensitive items.

### A7. Customers (customer-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:customers:list` | Lists | `@soostori/customers` | Desktop adapter |
| `db:customers:create` | Creates customer | `@soostori/customers` `CustomersService.create()` | Desktop adapter |
| `db:customers:update` | Updates | `@soostori/customers` `CustomersService.update()` | Desktop adapter |
| `db:customers:flag` | Sets risk flag | `@soostori/customers` `CustomersService.flag()` | Desktop adapter |

### A8. Debts (debt-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:debts:list` | Lists | `@soostori/debts` `DebtsService` | Desktop adapter |
| `db:debts:create` | Creates debt | `@soostori/debts` `DebtsService.create()` | Desktop adapter |
| `db:debts:payment` | Records payment | `@soostori/debts` `recordPayment()` | Desktop adapter |

### A9. Expenses (expense-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:expenses:list` | Lists | `@soostori/business/expenses` (NEW) | Desktop adapter + new SDK package needed |
| `db:expenses:create` | Creates | `@soostori/business/expenses` | Desktop adapter + new SDK package needed |

### A10. Devices (device-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:devices:list` | Lists | `@soostori/devices` `DevicesRepository` | Desktop adapter |
| `db:devices:register` | Registers device | `@soostori/devices` | Desktop adapter |
| `db:devices:heartbeat` | Updates heartbeat | `@soostori/devices` `DevicesRepository.heartbeat()` | Desktop adapter |
| `db:devices:setHost` | Promotes primary | `@soostori/devices` `PrimaryDeviceCoordinator.transferPrimary()` | Desktop adapter |

### A11. Sync (sync-conflict-handlers.ts, sync-queue-handlers.ts, sync-sale-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:syncConflicts:list` | Lists conflicts | `@soostori/sync` conflict list | Desktop adapter |
| `db:syncConflicts:resolve` | Resolves conflict | `@soostori/sync` resolve | Desktop adapter |
| `db:syncQueue:enqueue` | Adds to offline queue | `@soostori/storage` `OfflineQueue.add()` | Desktop adapter |
| `db:syncSales:create` | Creates sync_sale | `@soostori/sync` | Desktop adapter |

### A12. Auth (cloud-auth-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `cloud:auth:requestMagicCode` | Magic code request | `@soostori/cloud` | Direct (already in SDK) |
| `cloud:auth:verifyMagicCode` | Verify code | `@soostori/cloud` | Direct |
| `cloud:auth:registerDevice` | Register device | `@soostori/devices` + `@soostori/cloud` | Desktop adapter |

### A13. Cloud (cloud-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `cloud:syncEvents` | Push events | `@soostori/sync` | Desktop adapter |
| `cloud:pullShopSettings` | Pull shop settings | `@soostori/cloud` | Desktop adapter |
| `cloud:heartbeat` | Device heartbeat | `@soostori/devices` | Desktop adapter |
| `cloud:subscription:state` | Subscription check | `@soostori/subscription` | Desktop adapter |

### A14. Hardware (scanner-handlers.ts, printer-handlers.ts, hardware-handlers.ts)

These are platform adapters — NOT business logic. Keep in Electron.

### A15. Settings (settings-handlers.ts)

Shop settings, app settings — these are configuration, not business logic. They can stay in Electron but should use `@soostori/storage` `KeyValueStorage` interface.

### A16. Audit (audit-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:audit:log` | Log audit event | `@soostori/audit` `AuditRecorder.record()` | Desktop adapter |

### A17. Invite (invite-handlers.ts)

| IPC Method | Current Behavior | SDK Target | Adapter? |
|---|---|---|---|
| `db:invites:create` | Creates invite | `@soostori/auth` `inviteEmployee()` | Desktop adapter |
| `db:invites:accept` | Accepts invite | `@soostori/auth` `acceptInvite()` | Desktop adapter |
| `db:invites:list` | Lists invites | `@soostori/auth` | Desktop adapter |

---

## B. Sync Implementation (electron/sync/)

| Current File | Behavior | SDK Target |
|---|---|---|
| `discovery-service.ts` (124 lines) | UDP discovery | `@soostori/lan` (`TerminalClient` for terminals; `PrimaryHost` runs on Primary) — Desktop adapter runs on Primary only |
| `server.ts` (97 lines) | WebSocket server | `@soostori/lan` `PrimaryHost` — Desktop adapter |
| `client.ts` (142 lines) | WebSocket client | `@soostori/lan` `TerminalClient` — Desktop adapter runs on terminals |
| `server-handlers.ts` (137 lines) | Handle SALE_PENDING etc. | `@soostori/sync` `SalesService.authorize()` + events — Desktop adapter on Primary |
| `server-handlers-core.ts` (68 lines) | Shared handler logic | `@soostori/sync` engine internals |
| `types.ts` (63 lines) | Sync message types | `@soostori/events` + `@soostori/lan/messages` |
| `sync-service.ts` (161 lines) | Orchestrator | `@soostori/sync` `SyncEngine` |
| `sync-service-core.ts` (17 lines) | Status dispatcher | `@soostori/sync` engine internals |
| `sync-service-messages.ts` (50 lines) | Broadcast | `@soostori/sync` engine internals |

**Replacement:** All these become `@soostori/lan` + `@soostori/sync` calls.

---

## C. Cloud Services (electron/services/)

| Current File | Behavior | SDK Target |
|---|---|---|
| `cloud-auth.ts` (80 lines) | Auth session management | `@soostori/cloud-auth` (existing) |
| `cloud-entity-sync.ts` (202 lines) | Push entities to cloud | `@soostori/cloud-entity-sync` (new — replace with SDK sync) |
| `cloud-schema.ts` (244 lines) | Type definitions | REPLACE with `@soostori/schema` |
| `cloud-service.ts` (108 lines) | Generic cloud client | `@soostori/cloud` `CloudClient` |
| `cloud-snapshot.ts` (121 lines) | Initial snapshot | `@soostori/cloud-snapshot` (new — use `@soostori/inventory` ledger) |
| `cloud-sync.ts` (144 lines) | Background sync | `@soostori/sync` background task |
| `cloud-sync-service.ts` (92 lines) | Periodic sync | `@soostori/sync-task-service` |
| `heartbeat-service.ts` (66 lines) | Heartbeat | `@soostori/devices` `heartbeat()` |
| `instant-api.ts` (71 lines) | API helper | REPLACE with `@soostori/cloud` |
| `store.ts` (41 lines) | electron-store wrapper | `@soostori/storage` |
| `subscription-enforcer.ts` (146 lines) | Subscription policy | `@soostori/subscription` (existing) + `@soostori/cloud-subscription-enforcer` (move logic) |
| `sync-task-service.ts` (49 lines) | Background task | `@soostori/sync` `SyncEngine.pushPending()` |
| `cloud-auth-sync.ts` (81 lines) | Auth sync | `@soostori/cloud-auth` (already in SDK) |

---

## D. Database Schemas (electron/database/)

| File | Purpose | SDK Target |
|---|---|---|
| `schema-pos.ts` (129 lines) | products, sales, customers, etc. | Source for `@soostori/products`, `@soostori/sales`, `@soostori/customers`, `@soostori/debts` |
| `schema-commerce.ts` (133 lines) | business/employee/membership | Source for `@soostori/business` |
| `schema-sync.ts` (121 lines) | sync tables | Source for `@soostori/sync` |
| `schema-transactions.ts` (66 lines) | debt/inventory/sale_events | `@soostori/debts`, `@soostori/inventory` |
| `migrations.ts` (43 lines) | DB migrations | Keep — extend for new SDK adapter |
| `pin-hash.ts` (11 lines) | PIN hashing | REPLACE with `@soostori/auth` `hashPin()` |

---

## E. Migration Matrix

| Domain | Desktop File | SDK Package | Adapter Needed | Old Code Removable | Status |
|---|---|---|---|---|---|
| **Auth** | `auth-handlers.ts` (45 lines) | `@soostori/auth` | `auth-adapter.ts` | After tests pass | 🟡 Pending |
| | `cloud-auth-handlers.ts` (101 lines) | `@soostori/cloud-auth` | — | After tests pass | 🟡 Pending |
| | `pin-hash.ts` (11 lines) | `@soostori/auth` `hashPin` | — | YES | 🟡 Pending |
| **Business** | `shop-handlers.ts` (42 lines) | `@soostori/business` | `business-adapter.ts` | YES | 🟡 Pending |
| **Products** | `product-handlers*.ts` (220 lines) | `@soostori/products` | `products-adapter.ts` | After inventory done | 🟡 Pending |
| | `category-handlers.ts` (88 lines) | `@soostori/products` (categories) | same adapter | YES | 🟡 Pending |
| **Inventory** | `inventory-tx-handlers.ts` (59 lines) | `@soostori/inventory` | `inventory-adapter.ts` | YES (after sales) | 🟡 Pending |
| | `stock-handlers.ts` (72 lines) | `@soostori/inventory` | same | YES | 🟡 Pending |
| **Sales** | `sale-handlers-mutation.ts` (166 lines) | `@soostori/sales` | `sales-adapter.ts` — **MUST route via Primary** | YES | 🟡 Pending |
| **Customers** | `customer-handlers.ts` (88 lines) | `@soostori/customers` | `customers-adapter.ts` | YES | 🟡 Pending |
| **Debts** | `debt-handlers.ts` (88 lines) | `@soostori/debts` | `debts-adapter.ts` | YES | 🟡 Pending |
| **Devices** | `device-handlers.ts` (84 lines) | `@soostori/devices` | `devices-adapter.ts` | YES | 🟡 Pending |
| **Sync** | `electron/sync/*.ts` (~700 lines) | `@soostori/lan` + `@soostori/sync` | Network adapter | After integration test | 🟡 Pending |
| **Cloud** | `electron/services/cloud-*.ts` (~900 lines) | `@soostori/cloud` + `@soostori/sync` | HTTP adapter | After integration test | 🟡 Pending |
| **Audit** | `audit-handlers.ts` (38 lines) | `@soostori/audit` | `audit-adapter.ts` | YES | 🟡 Pending |
| **Notifications** | (none yet) | `@soostori/notifications` | NEW | — | 🟡 Pending |
| **Hardware** | `scanner-handlers.ts`, `printer-handlers.ts` | None — platform-only | Keep in Electron | NO (always) | ✅ Adapter |
| **Settings** | `settings-handlers.ts` (88 lines) | None — config only | Keep in Electron | NO | ✅ Adapter |
| **App** | `app-handlers.ts`, `app-db-io.ts` | None — platform | Keep in Electron | NO | ✅ Adapter |

---

## F. Migration Order (Highest Risk First)

The user's specified order:
1. ✅ Auth / device identity
2. Products
3. Inventory
4. Sales (with Primary Device routing)
5. Sync / LAN
6. Customers
7. Debts
8. Subscription enforcement
9. Notifications
10. Remaining

Each step: typecheck → unit test → Desktop integration test → verify behavior preserved.

---

## G. Schema Preservation Strategy

The Desktop has real user data in SQLite. **No destructive migrations.**

Steps:
1. Read existing SQLite schema (already documented in `schema-*.ts`)
2. Desktop `Repository<T>` implementations will be SQLite-specific — they read from the EXISTING tables, not new tables
3. The SDK Repository interface accepts any implementation, so Desktop's SQLite repos plug in directly
4. As SDK evolves, the Desktop repo can migrate incrementally — but existing tables stay intact
5. New SDK tables (if any) are additive, never modifying existing columns

---

## H. Idempotency & Stock-Sensitive Operations

All sale and stock adjustment operations MUST:
1. Use idempotencyKey from SoostoriEvent
2. Route through Primary Device when available
3. Reject when Primary is STALE/LOST
4. Be replay-deterministic

This is already enforced in `@soostori/sync` `SyncEngine.publish()` and `@soostori/inventory` `StockMovementLedger.apply()`.

---

## I. Next Steps

Per the user's instruction, we now proceed with Phase 9:

1. **First:** Create Desktop migration inventory (this document — DONE)
2. **Then:** Migrate auth/device identity (highest-risk, highest-value)
3. **Then:** Products, Inventory, Sales, Sync/LAN, Customers, Debts, Subscriptions, Notifications
4. **In parallel:** Fix the 6 brittle test fixtures

I will NOT publish anything during this phase.
