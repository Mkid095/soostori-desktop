# Phase 9.1.0 — Desktop Baseline (Pre-Migration)

**Date:** 2026-09-04
**Status:** ESTABLISHED — do not change until migration begins

---

## A. SQLite Schema Summary

### Auth/Device Tables (schema-commerce.ts)

```sql
employees       (id, shop_id, name, pin_hash, pin_salt, role, is_active, cloud_id, created_at, updated_at)
shops           (id, name, currency, owner_id, created_at)
devices         (id, shop_id, employee_id, device_name, device_type, capabilities,
                 is_host, is_online, connection_token, last_seen, created_at)
invitations     (id, shop_id, employee_name, role, code, device_name, created_by,
                 expires_at, used_at)
device_pairings (id, shop_id, device_id, requested_by, approved_by, status, token, created_at)
device_sessions (id, device_id, user_id, login_at, logout_at)
audit_logs      (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at)
```

### POS/Commerce Tables (schema-pos.ts + schema-commerce.ts)

```sql
shop_settings   (id, name, address, phone, email, currency, receipt_footer, receipt_prefix,
                 low_stock_threshold, mpesa_*, bank_*, created/updated_at)
app_settings    (id, default_theme, default_language, login_pin, pin_set, last_login, ...)
categories      (id, name, description, icon, color, display_order, is_active, ...)
products        (id, category_id, name, sku, barcode, description, image_url,
                 cost_price, selling_price, discount_price, unit,
                 stock_quantity, current_stock, low_stock_threshold,
                 track_inventory, has_variants, parent_variant_id, expiry_date, metadata,
                 is_active, created_at, updated_at, deleted_at,
                 distributor_name, distributor_phone, barcode_generated,
                 allow_single_unit_sale, units_per_package, box_buying_price,
                 bulk_selling_price, group_prices, ...)
product_variants(...)
```

### Sync/Transaction Tables (schema-sync.ts + schema-transactions.ts)

```sql
sync_queue        (id, device_id, event_type, payload, status, retry_count, created_at)
sync_events       (id, shop_id, device_id, event_type, payload, sequence_number, synced_at, created_at)
inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type,
                         quantity, balance_after, status, payload, sequence_number, created_at)
inventory_snapshots(...)
sync_processed    (id, device_id, idempotency_key, event_id, processed_at)
sync_conflicts    (id, shop_id, sale_id, device_id, employee_id, reason, payload, status, resolved_by, resolved_at, created_at)
sync_sales        (id, shop_id, sale_id, employee_id, device_id, status, payment_method, total, items_count, payload, created_at)
sales             (full retail POS transaction records)
sale_items        (line items per sale)
customers, debts, debt_payments, expenses, offer_combos
```

---

## B. IPC Handler Surface (auth, device, shop, invite)

| Handler | Input | Output | Behavior |
|---------|-------|--------|----------|
| `db:auth:login` | `{shopId, userId, pin, deviceId}` | `{sessionId, user}` | Verify PIN → create device_session → mark device online |
| `db:auth:createUser` | `{shopId, name, pin, role, createdBy}` | employee row | Hash PIN (100k PBKDF2) → INSERT employees |
| `db:auth:updateUser` | `{userId, name?, pin?, role?}` | employee row | Re-hash PIN if provided |
| `db:auth:deleteUser` | `userId` | `{success}` | Soft delete: `is_active = 0` |
| `db:auth:logout` | `deviceId, userId` | `{success}` | Set logout_at, `is_online = 0` |
| `db:devices:list` | `shopId` | device rows | `SELECT * FROM devices WHERE shop_id = ?` |
| `db:devices:register` | `{shopId?, deviceName?, deviceType?, capabilities?, employeeId?}` | device row | INSERT device, derive shopId from employee if needed |
| `db:devices:heartbeat` | `deviceId` | `{success}` | `is_online = 1, last_seen = now` |
| `db:devices:setHost` | `deviceId, shopId` | `{success}` | Reset all to `is_host=0`, set target to `is_host=1` |
| `db:devices:requestPairing` | `{shopId, deviceId, requestedBy, deviceName?}` | `{pairingId, token, alreadyExists}` | 1h window, returns existing if duplicate |
| `db:devices:approvePairing` | `pairingId, approvedBy` | `{success, token}` | Updates pairing + device with new connection_token |
| `db:devices:rejectPairing` | `pairingId` | `{success}` | Sets status = 'rejected' |
| `db:devices:getPairings` | `shopId` | pairing rows | |
| `db:devices:getConnectionToken` | `deviceId` | `{token}` | Returns device's connection_token |
| `db:invites:create` | `{shopId, employeeName, role, createdBy, deviceName?}` | invitation row | 6-digit numeric code, 24h expiry |
| `db:invites:accept` | `{code, userId}` | `{success, employee}` | Marks used_at, creates employee_device |
| `db:invites:list` | `shopId` | invitation rows | Pending only |
| `db:invites:delete` | `inviteId` | `{success}` | Hard delete |
| `db:shop:create` | `{name, currency, ownerName, ownerPin}` | `{shop, owner}` | Atomic: shop + employees row |
| `db:shop:get` | `shopId` | shop row | |
| `db:shop:update` | `{shopId, ...fields}` | shop row | |

---

## C. Auth Behavior Verification Scenarios

### Scenario 1: Fresh install → Shop creation
```
1. app_settings table has row with pin_set=0
2. Frontend detects pin_set=0 → shows SetupWizard
3. User enters: shop name, owner name, 4-digit PIN
4. db:shop:create → creates shops row + employees row (role=owner)
5. db:devices:register → creates device row (is_host=1)
6. app_settings updated: pin_set=1
7. Subsequent launches → LoginScreen (employee list)
```

### Scenario 2: Login with correct PIN
```
1. User selects name from list → enters PIN
2. db:auth:login → verifyPin(pin, pin_hash, pin_salt)
3. On match: INSERT device_sessions, UPDATE devices.is_online=1
4. Return {sessionId, user: {id, shop_id, name, role}}
```

### Scenario 3: Login with wrong PIN
```
1. db:auth:login → verifyPin returns false
2. Throw Error('Invalid PIN')
```

### Scenario 4: Create employee (owner/manager)
```
1. db:auth:createUser → hashPin(pin) → INSERT employees
2. New employee appears in login list
```

### Scenario 5: Device heartbeat
```
1. Every ~30s, renderer calls db:devices:heartbeat
2. is_online=1, last_seen=now
```

### Scenario 6: Host promotion
```
1. db:devices:setHost → UPDATE devices SET is_host=0 WHERE shop_id=?
2. → UPDATE devices SET is_host=1 WHERE id=?
3. Only one host per shop at a time
```

---

## D. Known Behavioral Invariants to Preserve

1. **PIN is 4 digits** — `EMPLOYEE_PIN_LENGTH = 4`, 100k PBKDF2 iterations
2. **login_pin in app_settings** — legacy single-user PIN, separate from employees
3. **is_active soft delete** — employees are never hard-deleted, only deactivated
4. **device_pairings 1h window** — duplicate pairing requests within 1h return existing record
5. **connection_token** — issued on pairing approval, used for LAN auth
6. **shop_settings single row** — id='default', not a multi-tenant shops table (shops table IS multi-tenant but shop_settings is legacy singleton)
7. **current_stock bootstrap** — initialized from stock_quantity on migration
8. **invitation codes** — 6-digit numeric, 24h expiry, single-use
9. **Roles** — owner, manager, cashier, attendant (attendant exists in permissions.ts but NOT in current employees table schema — role column accepts any string)

---

## E. SDK Contract Points

### `@soostori/auth` — What Desktop must wire to
- `hashPin(pin, salt?)` / `verifyPin(pin, hash, salt)` — **ALIGNED**: Desktop uses same 100k PBKDF2, same 4-digit length
- `ROLE_PERMISSIONS` — owner/manager/cashier/attendant — **ALIGNED**: Desktop roles match
- `SessionStorage` interface — Desktop must implement for electron-store
- `AuthSession` shape — `{userId, shopId, employeeId, deviceId, email, createdAt, expiresAt}`

### `@soostori/devices` — What Desktop must wire to
- `DevicesRepository` interface — Desktop has direct better-sqlite3, must wrap
- `DeviceIdentity` — `{deviceId, publicKey, cloudToken, shopId, cloudDeviceId, registeredAt}`
- `PrimaryDeviceState` — `{primaryId, electedAt, lastHeartbeatAt, stalenessMs, status, electionPending}`
- `canAuthorStockOps()` → `status === 'online'` — **CRITICAL**: Desktop must use SDK coordinator

### `@soostori/storage` — Repository contract
- `Repository<T>` — `findById, findMany, create, update, delete, transaction`
- Desktop's existing SQLite handlers already implement these patterns
- Domain: products, sales, customers, debts, categories, expenses

### `@soostori/core` — Shared types
- `EmployeeRole = 'owner' | 'manager' | 'cashier' | 'attendant'` — **MISMATCH**: Desktop schema omits 'attendant' from role CHECK but column accepts any string
- `DeviceType = 'desktop' | 'mobile'` — matches Desktop
- `Employee.status = 'active' | 'inactive'` — Desktop uses `is_active INTEGER 0/1`
- `Shop` canonical shape diverges from Desktop `shops` table (Desktop lacks `slug`, `taxRate`, `plan`, `subscriptionExpiry`, `status`)

---

## F. CONFLICTS IDENTIFIED (must resolve before migration)

| # | Conflict | Severity | Resolution Required |
|---|----------|----------|--------------------|
| 1 | `Shop` canonical type has `slug, taxRate, plan, subscriptionExpiry, status` — Desktop `shops` table has none of these | HIGH | Add columns OR createDesktopShopAdapter that maps. Add during Phase 9.1.1 scaffold. |
| 2 | `Employee.attendant` role — Desktop schema does not restrict role column to known values; 'attendant' will work but is not explicitly seeded | LOW | No schema change needed; 'attendant' string accepted |
| 3 | `devices.is_host` (INTEGER 0/1) vs `Device.isLanHost` (boolean) | MEDIUM | Map INTEGER→boolean in adapter |
| 4 | `employees.cloud_id` (TEXT) vs `Employee.cloudId` (UUID\|null) | MEDIUM | cloud_id stores UUID string, align type |
| 5 | `devices.connection_token` (TEXT) vs `Device.tokenRef` | MEDIUM | Map in adapter |
| 6 | `devices.capabilities` (JSON TEXT) vs `Device` capabilities in SDK type | MEDIUM | Parse JSON in adapter |
| 7 | `@soostori/devices` `DevicesRepository` is async (Promise-based) — Desktop handlers are synchronous | HIGH | desktop-adapter wraps sync SQLite calls in Promise |

---

## G. Baseline Test Scenarios (must pass after migration)

1. **Login flow**: Correct PIN → session created, device online. Wrong PIN → error thrown.
2. **Employee CRUD**: Create employee with PIN → can login. Update PIN → new PIN works. Soft-delete → cannot login.
3. **Device registration**: New device registers → appears in device list. Heartbeat → last_seen updated.
4. **Host election**: setHost → previous host demoted, new host has is_host=1.
5. **Invitation flow**: Create invitation → 6-char code, 24h expiry. Accept → employee created, used_at set.
6. **Pairing flow**: Request pairing → pending record. Approve → connection_token set. Reject → status='rejected'.
7. **Permission check**: cashier cannot access team settings. owner can. (via ROLE_PERMISSIONS from SDK)
8. **STALE Primary**: If Primary goes stale, `canAuthorStockOps()` returns false → stock mutations rejected.

---

*Baseline established. Do not modify Desktop code until Phase 9.1.1 scaffold is ready.*
