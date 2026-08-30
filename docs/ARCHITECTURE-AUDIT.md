# Desktop Architecture Audit

**Date:** 2026-08-30
**Scope:** Multi-terminal LAN sync implementation + cloud-sync readiness
**Status:** AUDIT COMPLETE — changes paused pending web agent schema agreement

---

## Architecture Context

The Soostori ecosystem has three distinct systems:

```
                    SOOSTORI CLOUD
                  Instant DB / Cloud
                         │
             ┌───────────┴───────────┐
             │                       │
        DESKTOP APP              WEB APP
       operational              owner/cloud
       + LAN HOST                dashboard
             │
             │ LAN
             ↓
        MOBILE CLIENTS
```

**Cloud:** Identity, subscription, backup, recovery, history
**Desktop:** Operational authority, SQLite, LAN host, cloud sync client
**Mobile:** Operational client, offline-capable, LAN sync client
**Web:** Owner visibility, reports, subscription/account management

---

## Current State Assessment

---

### 1. Authentication

**Current:** PIN verification against local `employees` table. PBKDF2 (100k iterations, random salt). Login: user selects name → enters 4-digit PIN → handler verifies hash+salt → creates `device_sessions` row.

**Required:** Online authentication against cloud identity. PIN is secondary/local fallback only.

**Gap:** Authentication is fully local. Users can create a production-equivalent shop with no cloud identity.

**Risk:** High — bypasses subscription control entirely.

**Files:** `auth-handlers.ts`, `LoginScreen.tsx`, `pin-hash.ts`

**Dependency:** Web agent — cloud auth schema.

---

### 2. First-Run Onboarding

**Current:** `SetupWizard.tsx` shows on first launch. Steps: (1) Shop name + currency, (2) Owner name + PIN. Creates `shops` + `employees` locally. No internet required.

**Required:** Welcome screen: **"Login with Online Account"** (production) or **"Join Existing Shop"** (employee). Both require online auth. Development/demo mode clearly labelled and not the default.

**Gap:** Production onboarding bypasses cloud entirely.

**Risk:** Critical — violates core architecture principle.

**Files:** `SetupWizard.tsx`, `SetupWizardSteps.tsx`

**Dependency:** Web agent — cannot finalize until cloud auth schema exists.

---

### 3. SetupWizard

**Current:** Creates `shops` + `employees` locally. No cloud involvement.

**Gap:** Must become dev-only or be replaced. Cannot remain the production path.

**Files:** `SetupWizard.tsx`, `SetupWizardSteps.tsx`

---

### 4. Local Shop Creation

**Current:** `db:shop:create` inserts into `shops` with locally-generated UUID.

**Required:** Shop identity originates from cloud. Desktop receives `shop_id` from cloud.

**Gap:** Full gap.

**Files:** `shop-handlers.ts`

---

### 5. Shop Identity

**Current:** `shops` table: `id` (local UUID), `name`, `currency`, `owner_id`. No cloud ID field.

**Required:** Must store both `cloud_id` (canonical) and `local_id` (operational). Cloud ID never generated locally.

**Gap:** No cloud ID concept.

**Files:** `schema-commerce.ts`, `types-shop.ts`

**Dependency:** Web/Instant DB schema agreement.

---

### 6. Employee Identity

**Current:** `employees` table with local UUID. `LoginScreen` fetches from local DB.

**Required:** Employee originates from cloud (owner creates). Desktop caches cloud employee records with role/permissions.

**Gap:** Employees created locally.

**Files:** `auth-handlers.ts`, `invite-handlers.ts`, `employees` schema

**Note:** The invitation system (6-digit code, 24h expiry) is architecturally correct and should be retained. It is the mechanism for employee onboarding. The employee record should ultimately be issued by cloud, not created by the accepting device alone.

---

### 7. Device Identity

**Current:** `devices` table with UUID. `LoginScreen` generates random device ID from `localStorage`. `registerDevice` IPC creates record. `connection_token` field exists for WebSocket auth. Token validated on every WebSocket connection.

**Required:** Device authorized by cloud before connecting. Token originates from cloud approval.

**Gap:** Device can be registered and obtain a connection token without cloud authorization.

**Files:** `device-handlers.ts`, `devices` schema

**Note:** The token-based WebSocket auth (server validates `?token=` param against `devices.connection_token`) is architecturally correct. The missing piece is that the token must come from cloud approval, not self-assigned.

---

### 8. Device Pairing

**Current:** `device_pairings` table. `requestPairing` creates pending. `approvePairing` approves. Pairing is LAN-local.

**Required:** Pairing approval should flow through cloud (owner approves from web dashboard). Cloud issues the connection token.

**Gap:** Pairing is LAN-local. Owner may not be physically present at the shop.

**Files:** `device-handlers.ts`, `device_pairings` schema

**Dependency:** Web agent — cloud must be the pairing authority in production.

---

### 9. Device Revocation

**Current:** No revocation handler exists.

**Required:** Cloud revokes device → next sync rejected → desktop enters locked state.

**Gap:** Full gap.

**Risk:** High — revoked devices can continue operating.

**Files:** None.

---

### 10. Subscription Readiness

**Current:** No subscription fields in any table. No verification logic.

**Required:** Fields: `status` (active/expired/trial), `expires_at`, `plan`, `last_verified`. Desktop caches subscription and enforces restricted state when expired.

**Gap:** Full gap.

**Dependency:** Web/Instant DB schema — cannot implement without agreement with web agent.

---

### 11. Cloud Sync Readiness

**Current:** No cloud sync exists. LAN sync (WebSocket) is implemented.

**Required:** Desktop pushes operational data to cloud via separate sync channel. Cloud sync is backup/recovery/history, not operational control.

**Gap:** Full gap. No cloud sync client exists.

**Files:** None.

**Dependency:** Web/Instant DB schema — must not guess.

---

### 12. Local → Cloud Backup Readiness

**Current:** All data stays in local SQLite only.

**Required:** Every record has a stable cloud ID for deduplication. Local IDs must not replace cloud IDs during backup.

**Gap:** Full gap.

**Files:** N/A

**Note:** The `sync_events` table with sequence numbers is a good foundation for an audit trail that could feed cloud backup. The cloud sync client itself is not built.

---

### 13. Cloud → Local Restore Readiness

**Current:** No restore mechanism. If local DB is lost, there is no recovery path.

**Required:** New device install → owner logs in → cloud contacted → shop snapshot downloaded → local SQLite populated → operations resume.

**Gap:** Full gap.

---

### 14. LAN Sync

**Current:** ✅ Fully implemented. WebSocket server on port 18792, client with auto-reconnect backoff, token auth, heartbeat, sequence-numbered events, device online/offline events.

**Assessment:** Solid implementation. Production-ready for LAN-only operation.

**Files:** `sync/server.ts`, `sync/client.ts`, `sync/sync-service.ts`, `sync/server-handlers.ts`, `sync/server-queries.ts`

---

### 15. Mobile Synchronization

**Current:** ✅ LAN sync client implemented in `sync/client.ts`. Mobile would connect via WebSocket URL + token.

**Gap:** Mobile app does not exist in this repo. LAN sync infrastructure is built and ready.

**Assessment:** Complete for desktop's responsibilities.

---

### 16. Sale State Machine

**Current:** ✅ `SALE_PENDING` → host validates stock → `SALE_CONFIRMED` or `SALE_REJECTED` → broadcast. Implemented in `sync/server-handlers.ts`.

**Gap:** No conflict queue processing. `SALE_REJECTED` goes to `sync_conflicts` table but no handler or UI to process it.

**Files:** `sync/server-handlers.ts`, `sync/sync-service.ts`

---

### 17. Inventory Event Sourcing

**Current:** ✅ `inventory_transactions` table with `balance_after`. `inventory-tx-handlers.ts` creates transactions.

**Gap:** `products` table does not have a `current_stock` cache column. The event sourcing model uses `inventory_transactions` but `products` has no cached stock column to update, causing divergence between the two systems.

**Files:** `inventory-tx-handlers.ts`, `schema-pos.ts`

**Risk:** Medium — stock may diverge between transaction ledger and product cache.

---

### 18. Offline Queue

**Current:** ✅ `sync_queue` table. `sync-queue-handlers.ts` adds/processes items. Client has retry logic.

**Gap:** Queue is not automatically replayed on reconnect. No background worker. Items accumulate but aren't processed.

**Files:** `sync-queue-handlers.ts`, `sync/client.ts`

---

### 19. Conflict Handling

**Current:** `sync_conflicts` table exists. No handler to list, review, or resolve conflicts. No UI.

**Gap:** Full gap.

**Risk:** High — offline sale conflicts accumulate with no resolution path.

**Files:** None.

---

### 20. Snapshots

**Current:** ✅ `inventory_snapshots` table. `createSnapshot` and `getLatestSnapshot` handlers exist.

**Gap:** Snapshots are not created automatically when a new device joins. No snapshot delivery to joining clients.

**Files:** `inventory-tx-handlers.ts`

---

### 21. Audit Logs

**Current:** ✅ `audit_logs` table and `audit-handlers.ts` exist.

**Gap:** Audit log writes exist but sale creation does not trigger an audit log entry.

**Files:** `audit-handlers.ts`

---

### 22. Database Migrations

**Current:** No migration system. Schema created fresh via `CREATE TABLE IF NOT EXISTS`. No version tracking.

**Gap:** Schema changes in future versions have no upgrade path. Users would lose data on upgrade.

**Risk:** High — production deployments cannot upgrade safely.

**Files:** None.

---

### 23. Crash Recovery

**Current:** `before-quit` handler closes DB cleanly. WAL mode enabled.

**Gap:** No crash recovery procedure. No integrity check on startup.

**Files:** `main.ts`

---

### 24. Idempotency

**Current:** `sync_events` uses UUIDs. No idempotency keys for repeated event processing.

**Gap:** Replayed events could create duplicates.

**Risk:** Medium.

---

### 25. Security

**Current:** ✅ PBKDF2 PIN hashing (100k iterations). WebSocket token auth. Context isolation. No `nodeIntegration`.

**Gap:** No rate limiting on PIN attempts. No account lockout. **`ADMIN_KEY = '849562'` hardcoded in `LoginScreen.tsx:13`** — security risk in any production context.

**Files:** `LoginScreen.tsx`

---

### 26. Clock Manipulation

**Current:** No detection.

**Gap:** No protection against local clock tampering to extend subscription or falsify timestamps.

---

### 27. Data Integrity

**Current:** Foreign keys enabled. WAL mode. better-sqlite3.

**Gap:** No checksums, no corruption detection, no backup integrity verification.

---

### 28. Device Replacement

**Current:** No restore mechanism. New device install has no recovery path.

**Gap:** Full gap.

---

### 29. Error Handling

**Current:** `try/catch` in handlers. Logged errors. No user-facing error screens for critical failures.

**Gap:** No structured error state for: expired subscription, revoked device, DB corruption, cloud unreachable during onboarding.

---

## Gap Summary by Priority

| Priority | Item | Risk | Dependency |
|---|---|---|---|
| 🔴 Critical | Production onboarding requires online auth | Architectural violation | Web agent — cloud auth schema |
| 🔴 Critical | Database migrations system | Data loss on upgrade | None — can implement now |
| 🔴 Critical | Subscription enforcement | Bypasses subscription | Web agent — subscription schema |
| 🔴 Critical | `ADMIN_KEY` hardcoded in LoginScreen | Security vulnerability | None — fix immediately |
| 🟠 High | `products` stock cache vs event sourcing mismatch | Stock divergence | None — investigate and fix |
| 🟠 High | Conflict resolution UI + handlers | Revenue disputes | None — can implement now |
| 🟠 High | Device revocation handling | Unauthorized access | Web agent |
| 🟠 High | Sync queue auto-replay on reconnect | Data loss | Cloud sync design |
| 🟡 Medium | Snapshot auto-creation on device join | Slow joins | None — can implement |
| 🟡 Medium | Idempotency keys | Duplicate events | None — can implement |
| 🟡 Medium | Clock manipulation detection | Subscription bypass | Web agent |
| 🟡 Medium | Crash recovery procedure | Data loss | None — can implement |
| 🟢 Low | Branch table | Not required now | N/A |

---

## What Is Working (Do Not Change)

- LAN WebSocket server/client architecture
- PBKDF2 PIN hashing (100k iterations, random salt)
- Device token auth on WebSocket connections
- Sale state machine (PENDING → CONFIRMED/REJECTED → broadcast)
- Invitation system design (6-digit code, 24h expiry)
- Role-based sidebar navigation
- Inventory transactions event sourcing model
- `src/shared/sync-protocol.ts` — shared event type contract
- SyncIndicator component
- Setup wizard and login screen UI/UX

---

## Immediate Actions (No External Dependency)

### 1. Remove hardcoded ADMIN_KEY
**File:** `src/components/LoginScreen.tsx:13`
```ts
const ADMIN_KEY = '849562'  // SECURITY RISK — remove or replace
```
Hardcoded secrets must not exist in production code.

### 2. Fix products.current_stock cache mismatch
**Files:** `schema-pos.ts`, `inventory-tx-handlers.ts`

The `inventory_transactions` event sourcing model requires `products.current_stock` as the cached speed layer. The `products` table in `schema-pos.ts` does not have this column. Investigate and add it. When `inventory-tx-handlers` updates stock, both the transaction record AND the `products.current_stock` cache must be updated atomically.

### 3. Add database migration system
**Files:** New file `electron/database/migrations.ts`

Implement a `migrations` table and a `migrate()` function that:
- Tracks current schema version in a `meta` table
- Runs delta SQL scripts in order on startup
- Never loses data on upgrade

Example:
```ts
// migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

---

## Blocked on Web Agent (Cannot Implement Without Cloud Schema)

1. **Cloud authentication** — online login flow, session management
2. **Subscription verification + enforcement** — status, expiry, restricted state
3. **Cloud sync contract** — backup/restore schema, push/pull protocol
4. **Device revocation from cloud** — `DEVICE_REVOKED` event handling
5. **Shop/employee identity from cloud** — `cloud_id` fields, authoritative IDs
6. **Branch table** — not required now; schema must accommodate later without migration

---

## Waiting on Web Agent

Before implementing cloud sync or online authentication, the web agent must finalize:

- **Cloud auth schema** — login, session, token refresh
- **Subscription schema** — `status`, `expires_at`, `plan`, `last_verified`, `next_verification_deadline`
- **Cloud sync schema** — tables for push backup, pull restore, cursor tracking
- **Identity fields** — `cloud_id` vs `local_id` for shops, employees, devices, products, sales
- **Sync event schema** — field names must match between desktop and cloud (e.g. `shop_id` vs `shopId`)

**Do not invent these independently.** Create an integration contract proposal and request the web agent's schema before proceeding.

---

## Implementation Order (After Web Agent Agreements)

**Phase 1:** Architecture alignment — resolve immediate security/migration issues
**Phase 2:** Production first-run online account initialization
**Phase 3:** Device identity + authorization
**Phase 4:** Subscription entitlement handling
**Phase 5:** Cloud sync contract integration
**Phase 6:** Cloud backup
**Phase 7:** Cloud restore/bootstrap
**Phase 8:** LAN operational reliability
**Phase 9:** Conflict resolution
**Phase 10:** Comprehensive testing

---

## Final Architecture

```
                 FUTURE CLOUD
            Instant DB / Cloud
                   │
     ┌─────────────┼─────────────┐
     │             │             │
  WEB APP      DESKTOP APP    MOBILE
  reports      SQLite         LAN client
  admin       LAN host       offline
  accounts     cloud sync     POS ops
               client
```

- **Cloud:** identity + subscription + backup + recovery + history
- **Desktop:** operational authority + SQLite + LAN host + cloud sync client
- **Mobile:** operational client + offline capability + LAN sync client
- **Web:** owner visibility + reports + subscription/account management
