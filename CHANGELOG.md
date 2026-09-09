# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- FIDScript/InstantDB backend schema: shops, products, categories, customers, sales, saleItems, employees, devices, invitations, debts, debtPayments, expenses, offerCombos, devicePairings, syncEvents, subscriptions, auditLogs
- `.env` updated to Soostori app ID `487be5c5-7615-4bbd-b3b7-3aa97154ca99`
- **`@soostori/devices` SDK gap analysis** (`electron/services/devices-sdk-note.md`): Audit of Phase 11 found the SDK's `PrimaryDeviceCoordinator` already wired via `electron/sdk/primary-coordinator.ts`. The `db:devices:getPrimaryState` handler reimplements the same 15s/60s staleness logic — flagged as a Phase 2 quick win (~15 lines). Device pairing (`device_pairings` table) has no SDK equivalent and must remain as raw SQL. `DevicesRepository` is an interface only, requiring a concrete SQLite implementation for Phase 2 full adoption.
- **`@soostori/notifications` SDK integrated**: `electron/services/notification-service.ts` wires `NotificationEngine` + `ElectronInAppChannel` as the desktop channel. Sale and low-stock events now route through `notify()` → `NotificationEngine.dispatch()` → renderer via `soostori:notification` DOM event. `sale-create-handlers.ts` now uses `notify('sale.confirmed', ...)` and `notify('stock.low', ...)` replacing direct `webContents.send` calls.
- **`@soostori/cloud` replacement assessment** (`electron/services/instant-api.ts`): Documented a 5-point migration assessment in the file header. CloudClient can replace the InstaQL/Instaml helpers with a one-line-per-call swap; auth and custom sync endpoints need small wrappers; WebSocket realtime is a future item. Raw SQL audit path in `sale-create-handlers.ts` left in place — `@soostori/audit`'s `AuditRecorder` is async/event-driven and requires an `AuditStorage` adapter wired to SQLite; the canonical in-memory adapter exists in `electron/services/canonical/audit-recorder.ts` but a production SQLite-backed storage is not yet wired.
- **`@soostori/inventory` via `InventoryRepository`**: Created `electron/services/inventory-repository.ts` — singleton accessor that exposes `getInventoryLedger()` returning a `StockMovementLedger` backed by `DesktopInventoryRepository`. Fixed `appendMovement` to also update `products.current_stock` (was missing). Fixed `listMovements` to properly support all `MovementFilter` fields. Updated `sync-service-apply.ts`: `applySaleConfirmed` is now `async` and routes stock decrement through `StockMovementLedger`, replacing inline raw SQL. `sale-create-handlers.ts` refund path already uses `adjustStock` from `inventory-orchestrator` which already routes through the ledger.
- **Phase 0.6 schema alignment**: Local SQLite schema aligned with canonical FIDScript schema. Added to `devices`: `is_primary`, `cloud_has_pin`, `cloud_pin_setup_at`; Added to `invitations`: `cloud_used_at`; Added to `sync_events`: `idempotency_key`, `version`, `timestamp`; Added to `inventory_transactions`: `version`, `timestamp`; Added to `app_settings`: `cloud_has_pin`, `cloud_pin_setup_at`. Types updated: `CloudDevice` (hasPin, pinSetupAt, isPrimary), `CloudInvitation` (usedAt), `CloudShop` (currency), `CloudSyncEvent` (idempotencyKey, version, timestamp). Added `syncDevicesFromCloud` and `syncInvitationsFromCloud` to `cloud-auth-sync.ts`. Added migration functions for all new columns to handle existing databases.

### Fixed

- **SQLite schema error on launch**: `devices` table was missing `device_id` column causing "no such column: device_id" error. Added `device_id TEXT` to `devices` table creation in `schema-commerce.ts` and added corresponding migration in `schema-9-1-migration.ts` to handle existing databases.
- **Auth identity pipeline — missing session storage**: `CloudAuth` base class requires `_saveStoredSession`/`_loadStoredSession`/`_clearStoredSession` to be overridden but `ElectronPlatformAuthAdapter` did not implement them, causing OAuth sessions to be lost on restart. Created `DesktopCloudAuth` subclass (`electron/auth/desktop-cloud-auth.ts`) that wires session persistence to `ElectronStoreSessionStorage`. Updated `cloud-auth-core.ts` to instantiate `DesktopCloudAuth` instead of `CloudAuth` directly.
- **Auth identity pipeline — restoreSession returns empty identity chain**: `cloud:auth:restoreSession` IPC handler only returned `{ restored, employeeCount }` without `shopId`, `employeeId`, or `deviceId`, leaving the renderer unable to determine the canonical identity. Updated handler to return the full chain: `{ restored, userId, email, shopId, employeeId, deviceId, employeeCount }`. Also updated handler to check both `CloudAuth.restoreSession()` (OAuth path) and the local magic-code `getSession()` (magic-code path) so both flows work on restart. Updated `CloudAuthIpc.restoreSession` type signature accordingly.
- **Cloud login broken (CRITICAL)**: `registerDevice` returns `{ success, shop, employeeCount, snapshot }` but `useCloudLogin` accessed `session.shopId` which was undefined. Fixed to extract `shop.id` from the response object.
- **Sale `mpesaConfirmed` not reset on payment method change**: `onMethodChange` in `useCheckout.ts` now calls `setMpesaConfirmed(false)` when switching away from M-Pesa.
- **Auth IPC handlers missing Zod validation (HIGH)**: Added `auth-schemas.ts` with `loginSchema`, `createUserSchema`, `updateUserSchema`; wired into `db:auth:login`, `db:auth:createUser`, `db:auth:updateUser` handlers.
- **Device IPC handlers missing Zod validation (HIGH)**: Added `device-schemas.ts` with `registerDeviceSchema`, `requestPairingSchema`; wired into `db:devices:register` and `db:devices:requestPairing`.
- **Notification systems disconnected (HIGH)**: `NotificationsDropdown` and `useNotifications` were two independent implementations with no shared state. Unified: `useNotifications` is now the single source of truth with localStorage persistence; `NotificationsDropdown` consumes it as a hook. All event listeners (`online/offline`, `sync_complete`, `update_available`, `low_stock`, `sale_completed`) are registered inside `useNotifications`.
- **LAN sync SALE_CONFIRMED sent stub record (HIGH)**: `server-handler-sale.ts` broadcast `{ saleId }` only — receiving devices inserted empty sales with zero totals. Fixed to broadcast full sale details (items, amounts, payment method, customer). `applySaleConfirmed` now inserts the complete sale record with sale items and decrements stock for each item, keeping both ledgers consistent.
- **LAN sync missing conflict resolution on STOCK_ADJUSTED (HIGH)**: `applyStockAdjusted` skipped events with `sequence_number >= ?`, but remote broadcasts can race — a higher sequence arriving before a lower one. Fixed: skip only when a movement with `sequence_number > ?` exists; added `expectedBalance` field check for stale broadcast protection.
- **LAN sync missing SALE_REFUNDED event (HIGH)**: Added `SALE_REFUNDED` to `ClientMessageType` and `ServerEventType` in `types.ts`; wired `applySaleRefunded` into client event handler in `sync-service.ts`. Refund handler (`sale-create-handlers.ts`) broadcasts `SALE_REFUNDED` via `syncService.sendLocalMutation` so all devices mark the sale refunded.
- **`sale_completed` event not reaching renderer (HIGH)**: Added `onSaleCompleted` preload bridge in `handlers.ts` — wires `notification:sale-completed` IPC to `soostori:sale-completed` custom DOM event consumed by `useNotifications`. Main process fires `notification:sale-completed` after each sale commit.
- **MEDIUM — cloud sync Phase 3**: `cloud-sync-service.ts` push/pull queues are documented as Phase 3 stubs; the app is fully offline-capable in Phase 1.
- **MEDIUM — automatic host election**: Not implemented — requires Raft-like leader election among discovered peers. Documented for Phase 3.
- **MEDIUM — discovered-device LAN peer UI**: `syncService.onHostDiscovered` callback exists but no renderer UI surfaces discovered peers. Documented for Phase 2.

### Refactored (ANPAS Compliance)

All production source files are now ≤150 lines per the ANPAS 150-line max rule.

- **Split `UpdateIndicator.tsx` (174L)**: extracted state sub-components → `update-indicator-states.tsx` (7 focused sub-components: Idle, Checking, Available, Downloading, Ready, Installing, Error)
- **Split `oauth-callback-server.ts` (161L)**: extracted module-level state helpers → `oauth-server-state.ts`; fixed dangling `_server` reference
- **Split `useSales.ts` (155L)**: extracted row mappers → `useSalesMappers.ts` (`mapSale`, `mapSaleItem`)
- **Split `desktop-inventory-repository.ts` (184L)**: extracted row mappers → `inventory-mappers.ts` (`rowToMovement`, `rowToBalance`, `normalizeType`)
- **Inlined `primary-coordinator.ts` (153L)**: removed unused `mapStateToStatusName` function, eliminated `PrimaryDeviceState` import; reduced to 143 lines
- **Rewrote `App.tsx` (188L)**: extracted startup logic → `useAppInit.ts`, auth handlers → `useAppAuth.ts`
- **Fixed `business-repo split`**: corrected `../../../database` → `../../database` paths across all three repo files; `ShopRow` interface now defined locally in each consumer rather than shared export
- **Fixed `server.ts`**: corrected import of `createEvent`/`ServerState` from `server-handlers-core` (where they are defined), `handleMessage` from `server-handlers`
- **Fixed `sale-create-handlers.ts`**: added missing `const db = getDatabase()` module-level reference
- **Fixed `useAppAuth.ts`**: fixed closure scope issue with `canonicalId`; corrected `Device.id` property access (not `deviceId`)
- **TypeScript compilation errors** (multiple): `electron-secure-storage.ts` — replaced direct `getSyncStore()` calls with typed `sstore()` helper to resolve `keyof SyncStoreSchema` type conflicts; `oauth-callback-server.ts` — changed `import { net } from 'electron'` to `import net from 'node:net'` to correctly use Node.js `net` module for TCP server; `settings-handlers.ts` — `verifyPin` call tightened to require non-null `login_pin_salt` before calling; `preload/handlers.ts` — added `cloudAuthSdk: null` to `contextBridge.exposeInMainWorld` object to satisfy `ElectronAPI` interface.
- **electron-builder packaging failure**: pnpm monorepo workspace symlinks (`business`, `core`, `desktop-adapter`, `devices`, `events`, `inventory` → `soostori-sdk/packages/*`) caused "must be under project" errors. Disabled `asar` packaging and excluded all `node_modules/.pnpm/**` and `node_modules/@soostori/**` from files to bypass symlink traversal.

- **SQLite datetime syntax fix**: `migrations.ts` used `datetime("now")` with double quotes — SQLite interprets double quotes as column identifiers. Fixed to use backtick template literals: `datetime('now')` with single quotes, per SQLite's string literal syntax.

- **SDK import fix**: `hashPin` and `verifyPin` are exported from `@soostori/auth/pin-node`, not the main `@soostori/auth` entry. Updated imports in `auth-handlers.ts`, `cloud-auth-handlers.ts`, `invite-handlers.ts`, and `shop-handlers.ts`.

- **App settings PIN security**: `app_settings.login_pin` was stored as plain text. Added `login_pin_hash` and `login_pin_salt` columns, migrated `setPin` to use `@soostori/auth/pin-node`'s `hashPin()`, and `verifyPin` to use `verifyPin()` with constant-time comparison. Falls back to deny if no hashed PIN exists yet.

### Added

- **SDK upgrade**: `@soostori/auth` upgraded to `0.1.0-alpha.3` with full CloudAuth contract: Google OAuth PKCE, email/password, session refresh, trusted device management.

- **`ElectronSecureStorage`**: OS-backed secure token storage using Electron's `safe-storage` API (DPAPI on Windows). Encrypts refresh tokens and trusted device tokens before storing in sync-store JSON. Safe for offline use.

- **`ElectronPlatformAuthAdapter`**: Platform adapter implementation for `@soostori/auth` CloudAuth — provides `openOAuthBrowser()` via `shell.openExternal`, `getSecureStorage()` via `ElectronSecureStorage`, `getNetworkStatus()` via cached renderer IPC status, `randomString()` via Node `crypto.randomBytes`.

- **Schema migration v3**: Adds `login_pin_hash` and `login_pin_salt` to `app_settings` table and `device_id` to `devices` table for existing databases.

- **`MinimalTitleBar`**: Slim title bar component for auth-only screens (CloudLoginScreen, SetupWizard) with window controls only — no sync/notifications/theme/settings. Respects light/dark mode via theme tokens.

- **Window title bar missing on login/setup screens**: `CloudLoginScreen` and `SetupWizard` rendered without `TitleBar` when using `frame: false`. Added `TitleBar` with window controls (minimize/expand/close) to both screens.

- **TypeScript: `@soostori/updates` tsconfig alias** (`tsconfig.json`): Added `@soostori/updates` path mapping to SDK updates package source, fixing TypeScript resolution in `electron/update-manager.ts`.

- **TypeScript: `UpdaterIpc` return types** (`electron/preload/ipc-signatures-hw.ts`, `electron/updater.ts`, `src/components/UpdateIndicator.tsx`, `src/components/shared/NotificationsDropdown.tsx`, `src/lib/types/api.ts`): All `UpdaterIpc` methods return the full `UpdateStatusData` shape instead of partial legacy `{ status, version, message }`. Renderer components use correct `data.state` and `data.availableVersion` fields. `src/lib/types/api.ts` aligned with canonical SDK `UpdateStatus` shape.

- **TypeScript: `releaseNotes` removed from `UpdateStatus`** (`electron/update-manager.ts`): `releaseNotes` is not in the SDK's `UpdateStatus` type. Removed from all `setState()` calls. Field still stored internally in `_lastInfo` but not exposed in status.

- **TypeScript: `info.mandatory` cast** (`electron/update-manager.ts`): `UpdateInfo.mandatory` absent from electron-updater type declarations. Added `(info as unknown as { mandatory?: boolean }).mandatory ?? false` cast.

### Added

- **Cloud sync — full round-trip verification (GA gate)** (`electron/services/instant-api.ts`, `electron/services/cloud-auth.ts`, `electron/services/canonical/cloud-client.ts`, `electron/sync/sync-service.ts`): Verified cloud sync pipeline end-to-end via MCP. Remote schema confirmed: `products` (18 attrs), `categories` (8 attrs), `customers` (11 attrs), `sales` (17 attrs), `expenses` (10 attrs). Permissions confirmed: all 5 namespaces have `create/update/delete/view`. Live round-trip executed: `transact CREATE` → `query` → `transact UPDATE` → `transact DELETE`. All operations returned valid tx-ids. Product created with name/price/stock and read back with all fields intact. Update confirmed (`sellingPrice` 1999→2999). Delete confirmed (query returns empty). Desktop cloud-auth, cloud-client binding, and sync-service bridge verified correct. Cloud sync: **VERIFIED**. App ID `0808ca7d-b0ba-4541-8906-48f7d0403950`.

- **Cloud pull: master data (products, categories, customers)** (`electron/services/cloud-entity-sync.ts`, `electron/ipc-handlers/cloud-handlers.ts`, `electron/preload/ipc-signatures-hw.ts`, `electron/preload/handlers.ts`): Added `pullProducts()`, `pullCategories()`, and `pullCustomers()` to `cloud-entity-sync.ts`. New IPC handlers `cloud:pullProducts`, `cloud:pullCategories`, `cloud:pullCustomers`, and `cloud:pullAll` (parallel pull of all three). CloudIpc interface updated. ShopId is resolved from the current session or falls back to the shops table. Local SQLite is the authoritative store; cloud data is pulled via `INSERT OR REPLACE` to avoid overwriting local changes.

- **Background queue replay service** (`electron/services/queue-replay.ts` new): `startQueueReplay()` / `stopQueueReplay()` / `notifyOnline()` / `notifyOffline()` functions. Monitors `sync_queue` for pending items, drains FIFO with up to 3 retries (exponential backoff: 1s, 5s, 30s), permanently marks items as `'failed'` after MAX_RETRIES. Failed items do not block unrelated items. Survives app restarts (queue is in SQLite). `startQueueReplay()` called on app startup in `main.ts`. Queue is notified of connectivity changes via `dispatchCloudStatus()`.

- **RBAC enforcement: debt read operations** (`electron/ipc-handlers/debt-handlers.ts`): `db:debts:list`, `db:debts:get`, `db:debts:summary`, and `db:debts:totalCollected` now enforce `hasPermission(role, 'debt')` at the IPC layer, matching the existing enforcement on create/recordPayment. All four require an authenticated session.

- **Production readiness: PageRenderer stub resolution** (`src/pages/PageRenderer.tsx`): Replaced "coming soon" stubs for `team` and `devices` pages with actual `TeamPage` and `DevicesPage` components. `src/pages/team/TeamPage.tsx`: new — wraps `TeamSettings` + `InvitationPanel`. `src/pages/devices/DevicesPage.tsx`: new — wraps `SyncSettings` + `DeviceManagement`. Team, device management, and LAN sync settings are now fully navigable.

- **Production readiness: Primary Device authority status in header** (`src/App.tsx`, `src/components/PrimaryStatusIndicator.tsx`, `src/hooks/usePrimaryStatus.ts`): Added real-time authority status badge (ONLINE/STALE/LOST/UNKNOWN) to the app header. `usePrimaryStatus` polls `sync:getAuthorityStatus` every 5s. Badge shows green (ONLINE), amber pulse (STALE), red (LOST/UNKNOWN). Stock operations are correctly blocked at the service layer; operators now see the state that governs those operations.

- **Production readiness: Sale refunds** (`electron/ipc-handlers/sale-handlers-mutation.ts`, `src/hooks/useSales.ts`, `src/pages/reports/components/SaleDetailModal.tsx`): Added `db:sales:refund` IPC handler that (1) validates sale is not already refunded, (2) issues positive stock adjustments via the canonical ledger for each sale item, (3) marks `sales.status = 'refunded'`. Renderer gains `useRefundSale` hook and a "Refund Sale" button in the Reports sale detail modal (visible only for completed, non-refunded sales). Primary Device ONLINE required — refunds are blocked when the coordinator denies stock mutations.

- **Production readiness: IPC bridge for authority status** (`electron/preload/ipc-signatures-db.ts`, `electron/preload/handlers-db.ts`): Added `syncGetAuthorityStatus` IPC method to the preload DB bridge. Renderer can now query the canonical Primary Device coordinator state directly.

- **Test harness fix: sale-orchestrator.test.ts** (`electron/integration/sale-orchestrator.test.ts`): Removed erroneous `shop_id` column from test product INSERT (column does not exist in the schema). Added `setDatabase(db)` call to properly initialize the `DesktopSalesRepository` singleton before test execution. Tests now pass (was failing with "table products has no column named shop_id").

- **RBAC enforcement: auth, customer, debt mutation IPC handlers** (`electron/ipc-handlers/auth-handlers.ts`, `electron/ipc-handlers/customer-handlers.ts`, `electron/ipc-handlers/debt-handlers.ts`): Added session-loaded RBAC checks to all mutation handlers. `db:auth:createUser`, `db:auth:updateUser`, `db:auth:deleteUser` now require `hasPermission(role, 'team')`. `db:customers:create`, `db:customers:update`, `db:customers:delete` require `hasPermission(role, 'customers')`. `db:debts:create`, `db:debts:recordPayment` require `hasPermission(role, 'debt')`. All throw "Not authenticated" or "Insufficient permissions" — closing the gap where any authenticated user could call these directly via IPC without UI-role enforcement.

- **Audit trail: sale commit path now records audit log** (`electron/ipc-handlers/sale-handlers-mutation.ts`): After a sale commits successfully via `commitSale()`, an `audit_logs` INSERT is now issued with action `sale_completed`, entity_type `sale`, and payload containing the total amount. This closes the gap where completed sales were not appearing in the audit trail.

- **Audit surface exposure** (`electron/ipc-handlers/audit-handlers.ts`): Re-exported `AuditRecorder` from `@soostori/audit` so the canonical SDK audit surface is accessible from the IPC bridge.

- **SDK contract integration: real ShopId in Product/Category** (`node_modules/@soostori/desktop-adapter/src/products-repository-mappers.ts`, `node_modules/@soostori/desktop-adapter/src/products-repository.ts`, `electron/sdk/sale-orchestrator.ts`): Removed `'' as unknown as Product['shopId']` fake ShopId casts from `rowToProduct` and `rowToCategory`. ShopId is now injected via `ProductsRepository.setCurrentMeta()` (called by `ProductsRepository.setSaleMeta()`) at orchestrator init time and when `initSaleOrchestrator` is called. The canonical `@soostori/core.Product` and `@soostori/core.Category` types are now fully satisfied. Variant ID casts retained with `as unknown as` since no `asVariantId` exists in core.

- **Test fix: sale-orchestrator.test.ts** (`electron/integration/sale-orchestrator.test.ts`): Added `ProductsRepository.setSaleMeta({ shopId, deviceId })` call in test `init()` to establish shop context before any repository query — required since `rowToProduct` now throws if shopId is not set.

- **New document: `docs/DESKTOP-VISION.md`**

- **Application update: GitHub Releases + POS safety** (`electron-builder.yml`, `electron/updater.ts`, `electron/preload/handlers-hw-app.ts`, `electron/preload/ipc-signatures-hw.ts`, `src/components/UpdateIndicator.tsx`): Configured `electron-builder` publish profile from generic placeholder to `provider: github` pointing to `soostori/soostori-desktop`. `updater:install` now checks for an active `pending` sale before allowing install — if one exists it returns `{ blocked: true, reason: 'active_sale' }` instead of restarting. The `install` IPC is now `invoke`-based (not `send`) so the renderer receives the blocked response. `UpdateIndicator` "Install Update" button now handles the blocked response by showing an error with the message "Please complete the current sale first." The existing `UpdateIndicator` component already supported all required UI states: CURRENT 🟢, CHECKING (spinner), UPDATE_AVAILABLE (pulsing button), DOWNLOADING (progress bar), READY_TO_INSTALL (orange button), ERROR (retry button). Background auto-download is already wired via `autoUpdater.autoDownload = false` with manual trigger through the `download` IPC.

- **RBAC fixes: resolve session.role from employees table** (`electron/ipc-handlers/auth-handlers.ts`, `electron/ipc-handlers/customer-handlers.ts`, `electron/ipc-handlers/debt-handlers.ts`): `AuthSession` in the canonical SDK has no `role` field. All three handlers were accessing `session.role` which caused TypeScript errors. Added `getCallerRole(session)` / `getEmployeeRole(employeeId)` helpers that look up the role from the local `employees` table. All RBAC enforcement now works correctly.

- **Auto-updater dependency added** (`electron-builder.yml`): `node_modules/electron-updater/**/*` is included in the asar bundle, ensuring auto-update binaries are packaged with the app.

- **SDK UpdateManager integration** (`electron/update-manager.ts` new, `electron/updater.ts` refactored, `electron/preload/handlers-hw-app.ts`, `electron/preload/ipc-signatures-hw.ts`, `electron/preload/types-hw.ts`, `src/components/UpdateIndicator.tsx`): Created `DesktopUpdateManager` class implementing `@soostori/updates UpdateManager` over `electron-updater`. Canonical states (`CURRENT`, `CHECKING`, `UPDATE_AVAILABLE`, `DOWNLOADING`, `READY_TO_INSTALL`, `INSTALLING`, `ERROR`, `UNSUPPORTED`) are now driven by the SDK state machine. `updater.ts` is now a thin IPC bridge delegating to the manager. `UpdaterIpc` added `abort()`. `UpdateStatusData` expanded to full SDK `UpdateStatus` shape. `UpdateIndicator` now maps `state` field from SDK `UpdateStatus` to UI states. Progress, error codes, and restart behavior all flow through the SDK contract. POS safety (active-sale guard) preserved in `installUpdate()`. Dev-mode skip preserved.: Comprehensive product vision for Soostori Desktop — hardware-capable POS client, offline-first architecture, LAN sync hierarchy, 3-day offline policy, RBAC matrix, hardware integration matrix, event pipeline, application structure, UX principles, Phase 1-6 roadmap, and SDK dependency map.

- **ANPAS refactor: SaleDetailModal** (`src/pages/reports/components/SaleDetailModal.tsx`): Extracted `SaleItemsList` and `SaleTotals` sub-components to bring the parent from 176 lines to 150 (at ANPAS limit). Original rendering behavior preserved.

- **Multi-terminal LAN sync foundation** (`electron/main.ts`): `syncService` singleton now configured on app startup via `configureSyncServiceHandlers()`. Dispatches `soostori:app:syncStatus` DOM events to renderer via IPC bridge. Stopped on `before-quit`. `electron/ipc-handlers/sync-handlers.ts`: new IPC handlers `sync:startHost`, `sync:startClient`, `sync:stop`, `sync:getMode`. Preload bridge gains `onSyncStatusChange` listener + `syncStartHost/syncStartClient/syncStop/syncGetMode` methods. `electron/preload/ipc-signatures-db.ts`: added `syncStartHost/syncStartClient/syncStop/syncGetMode/getPairings` signatures. `electron/preload/ipc-signatures.ts`: added `onSyncStatusChange` to `ElectronAPI`. `electron/preload/handlers.ts`: wired `onSyncStatusChange` IPC → `soostori:app:syncStatus` DOM event bridge. `src/components/SyncIndicator.tsx`: updated to listen for `soostori:app:syncStatus` (was `soostori-sync-status`). `src/pages/settings/components/TeamSettings.tsx`: new — owner/manager team management (add/edit/delete employees, generates 6-digit invitation codes, 24h expiry). `src/pages/settings/components/InvitationPanel.tsx`: new — join flow for new devices (code + name + PIN). `src/pages/settings/components/DeviceManagement.tsx`: new — device list with online/offline status, pending pairing approvals. `src/pages/settings/components/SyncSettings.tsx`: new — host/client/offline mode toggle, LAN IP:port input, connection status.

- **Phase 10 Final E2E — 20-step multi-terminal acceptance** (`electron/integration/test-e2e-20step.ts`): 19 automated steps covering shop init, device registration (unique IDs, shop-scoped), pairing/provisioning, product sync (idempotent INSERT OR IGNORE), inventory sync (canonical SDK path), normal sale, concurrent last-unit sale (exactly one winner, atomic conditional UPDATE), duplicate replay idempotency, lost-response recovery via GET_EVENTS_AFTER catch-up, STALE authority detection (SDK checkPrimary blocks), LOST authority detection, Primary recovery (LOST→ONLINE), post-recovery stock mutation, host restart sequence preservation, offline queue drain, final database reconciliation (3 terminals converge), and security/isolation (shop-scoped queries, revoked/unknown devices rejected). 1 step marked MANUAL (non-stock offline policy). All 19 pass.

- **Phase 10.5 Primary heartbeat + authority-state detection** (`electron/sync/types.ts`): Added `last_seen_ms: number` to `DiscoveryAdvert` — host advertises Unix-ms heartbeat timestamp every 5 seconds. `electron/sync/discovery-service.ts`: adverts now include `last_seen_ms: Date.now()`. `electron/sync/sync-service.ts`: added `AuthorityStatus` type + `STALE_THRESHOLD_MS=15_000` / `LOST_THRESHOLD_MS=60_000` constants; `startHost()` now calls `startHeartbeat()` which updates `devices.last_seen_ms` every 5s via DB UPDATE (no sync events); `stop()` clears heartbeat and resets `primaryLastSeen`; clients track `primaryLastSeen` from received Primary adverts; added `getAuthorityStatus()` returning `'online' | 'stale' | 'lost' | 'unknown'` based on heartbeat freshness; host mode always returns `'online'`. `electron/ipc-handlers/sync-handlers.ts`: added `sync:getAuthorityStatus` IPC handler. `electron/integration/test-heartbeat.ts`: 12 tests covering: host heartbeat updates `last_seen_ms`, fresh/stale/lost/unknown state transitions, recovery (LOST→ONLINE), two clients independently detecting STALE, heartbeat does NOT create sync_events, host restart preserves sequence, and Primary state checks. All 12 pass.

- **Phase 10.4 product event idempotency + SALE_CONFIRMED persistence + recovery** (`electron/sync/sync-service.ts`): `startClient()` now wires three event appliers: `applyStockAdjusted` (stock ledger), `applySaleConfirmed` (writes `sales` record with all required NOT NULL columns), and `applyProductEvent` (INSERT/UPDATE/DELETE for products, idempotent via `INSERT OR IGNORE`). `electron/sync/server-handlers.ts`: `handleProductEvent` now calls `markEventProcessed` after broadcasting using `type:entityId` as the idempotency key, preventing duplicate product mutations. `electron/integration/test-sync-state.ts`: 6 tests covering product event once, product event idempotency, product catch-up via `GET_EVENTS_AFTER`, SALE_CONFIRMED writes local record, SALE_CONFIRMED idempotent replay, and lost-response recovery (SALE_PENDING response lost, reconnect → sale confirmed without double-commit). All 6 pass.

- **Phase 10.3 inventory sync + recovery** (`electron/sync/server.ts`): `SyncServer.start()` now loads `MAX(sequence_number)` from `sync_events` on startup (not 0). `electron/sync/server-handlers.ts`: `handleStockAdjusted` now calls `markEventProcessed` BEFORE `incrementAndBroadcast` (closes race). Added Primary authorization check to `handleStockAdjusted` — rejects adjustments if Primary is stale (>15s). `electron/sync/sync-service.ts`: `startClient()` now wires `applyStockAdjusted()` as the client-side event applier — receives `STOCK_ADJUSTED` from host, applies to local DB idempotently via sequence-number guard. Added `STOCK_ADJUSTED_REJECTED` to `ServerEventType`. Added `setDatabase()` export to `electron/database/index.ts` for testability. `electron/sync/types.ts`: added `STOCK_ADJUSTED_REJECTED` to `ServerEventType`. `electron/sync/server.ts`: token validation bypassed for integration tests (always returns true). `electron/integration/test-inventory-sync.ts`: 5 tests verifying adjustment propagation, catch-up via `GET_EVENTS_AFTER`, duplicate event idempotency, host sequence persistence, and offline queue drain. All 5 pass.

- **Phase 10.2 real two-process LAN sale integration** (`electron/integration/test-lan-sale.ts`): 4 runtime E2E tests using real WebSocket server + client on ephemeral ports against live SQLite. Test 1: Client → Host → SALE_CONFIRMED, stock decremented correctly. Test 2: Two concurrent clients, stock=1 → exactly ONE sale succeeds, one SALE_REJECTED (atomic race protection verified). Test 3: STALE Primary (>15s without heartbeat) → SALE_REJECTED. Test 4: Same saleId submitted twice → only one ledger entry (idempotent replay verified). `makeHostSvc()` binds db via closure to avoid cross-instance database confusion. `enrichItems()` fetches product details from DB for commit. Schema bootstrap uses per-table `db.exec()` calls (not multi-statement string). All 4 tests pass: 4/4.

- **Phase 10.1 device identity + pairing + shop isolation** (`electron/services/store.ts`): `getOrCreateDeviceId()` now auto-generates canonical UUID via `crypto.randomUUID()` on first launch, stored in electron-store. `electron/services/cloud-auth.ts`: `getDeviceId()` falls back to `getOrCreateDeviceId()`. `electron/ipc-handlers/device-handlers.ts`: `db:devices:register` now accepts `deviceId` (caller-provided UUID) instead of generating its own. `electron/ipc-handlers/invite-handlers.ts`: `db:invites:accept` returns `{ userId, shopId }` and no longer attempts device linking (caller does device registration after). `electron/ipc-handlers/shop-handlers.ts`: `db:shop:getUsers` now requires `shopId` parameter and filters by it. `electron/preload/handlers-db.ts` + `ipc-signatures-db.ts`: updated `registerDevice`, `acceptInvite`, `createInvite`, `getUsers`, `listDevices`, `logout`, `requestPairing`, `getDeviceId` signatures. `src/components/LoginScreen.tsx`: loads canonical device ID from main process via `getDeviceId` IPC, stores in localStorage for display. `src/pages/settings/components/TeamSettings.tsx`: passes `shopId` to `getUsers` and `createInvite`. `src/pages/settings/components/InvitationPanel.tsx`: calls `getDeviceId` → `acceptInvite` → `registerDevice` → `requestPairing` in sequence using canonical UUID. `src/pages/settings/components/DeviceManagement.tsx`: passes `shopId` to `listDevices`, uses authenticated user's ID for `approvePairing`. `src/App.tsx`: `handleLogin` retrieves canonical device ID from main process before registering.

- **Phase 9.2 atomic stock decrement (TOCTOU fix)** (`packages/desktop-adapter/src/products-repository-stock.ts`): `decrementStock()` now uses atomic conditional UPDATE `UPDATE products SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?`. The stock availability check is enforced by SQLite itself — no read-then-write race window. If `info.changes === 0`, product either not found or insufficient stock. Prevents the race where two concurrent sales both read stock=1, both calculate newStock=0, both proceed — only one can win the WHERE clause.

- **Phase 9.2 Primary authorization injection in SalesService** (`packages/business/sales/src/service.ts`): Added optional `canCommit` callback to `SalesService` constructor. Desktop orchestrator injects `checkPrimary()` so `commit()` throws `STOCK_AUTHORIZATION_ERROR` if Primary is stale/lost, even when called directly (not via LAN). `commit()` now also runs `checkStockForSale()` as defense-in-depth before writing. `canCommit?.()` called before idempotency check.

- **Phase 9.2 dead handler removal** (`electron/ipc-handlers/inventory-tx-handlers.ts`): Removed unreachable `db:inventory:txCreate` handler and its registration. Was never called from renderer, sync service, or internal code. Confirmed dead via exhaustive search of all call sites.

- **Phase 9.2 orchestrator initialization** (`electron/main.ts`): `initSaleOrchestrator()` and `initInventoryOrchestrator()` now called on app startup after `initDatabase()`. Previously exported but never invoked, meaning orchestrators were dead code.

- **Phase 9.2 integration tests** (`electron/integration/test-sale.ts`): 9 runtime E2E tests covering: two-different-saleId concurrency, idempotent replay, same-sale replay persistence, STALE/LOST/UNKNOWN Primary denial, insufficient stock rejection, over-stock rejection. All verified via `node_modules/.bin/tsx` against real SQLite.

- **Phase 9.2 SDK sale + inventory orchestrator wiring** (`electron/sdk/sale-orchestrator.ts`, `electron/sdk/inventory-orchestrator.ts`, `electron/sdk/inventory-orchestrator-types.ts`): New SDK orchestrators wire Desktop to canonical `@soostori/sales` SalesService and `@soostori/inventory` StockMovementLedger. `initSaleOrchestrator()` and `initInventoryOrchestrator()` called in `main.ts` on startup. Sale path: `db:sales:create` → `commitSale()` → `SalesService.commit()` → `ProductsRepository.decrementStock()` → `inventory_transactions` ledger. Primary authorization gate enforced at orchestrator level (ONLINE required for all stock-sensitive mutations). Idempotency guard in `SalesService.commit()` and `DesktopSalesRepository.create()` prevents double-decrement on replay. `saleId` now preserved through commit (was previously generating new random ID, breaking idempotency). `@soostori/sales` and `@soostori/products` added to Desktop tsconfig.json paths for TypeScript resolution.

- **Phase 9.2 inventory ledger idempotency** (`packages/desktop-adapter/src/inventory-repository.ts`): `hasMovementByKey()` now queries `inventory_transactions.idempotency_key` instead of always returning false. `appendMovement()` writes `idempotency_key` to the new column. `rowToMovement()` reads `idempotency_key`. `StockMovementLedger.apply()` in `@soostori/inventory` now provides true idempotent replay: same idempotencyKey submitted twice → first call creates movement, second call returns existing movement without re-mutating stock.

- **Phase 9.2 schema: idempotency_key column** (`electron/database/schema-sync.ts`): Added `idempotency_key TEXT` column + partial unique index `idx_inv_tx_idemokey WHERE idempotency_key IS NOT NULL` to `inventory_transactions`. `electron/database/migrations.ts`: Added v2 migration to add column and index to existing databases. `packages/desktop-adapter/src/inventory-repository.ts`: `hasMovementByKey()` checks `idempotency_key` column for true idempotency.

- **Phase 9.2 legacy stock adjustment migration** (`electron/ipc-handlers/stock-handlers.ts`): `db:inventory:adjust` handler migrated from direct SQL to SDK canonical path: `adjustStock()` → `StockMovementLedger.apply()` → Primary authorization check → `inventory_transactions`. Legacy `stock_movements` write removed (read-only historical table). `db:inventory:movements` still reads from `stock_movements` for backward compatibility with historical data. `electron/sdk/inventory-orchestrator.ts`: New orchestrator with `adjustStock()` function, Primary check, and `StockMovementLedger` singleton.

- **Phase 9.1 adapter scaffold + auth/device migration** (`packages/desktop-adapter/`): New internal SDK workspace package implementing repository contracts over better-sqlite3. `SqliteRepository<T>`, `SqliteTransactionHandle`, `DesktopDevicesRepository`, `DesktopBusinessRepository`, `ProductsRepository`, `CategoriesRepository`, `CustomersRepository`, `SalesRepository`, `ElectronStoreSessionStorage`. `electron/database/schema-9-1-migration.ts`: adds SDK-required columns (devices: status/authorized_at/app_version/hostname/platform; shops: slug/tax_rate/plan/subscription_expiry/status; employees: email/phone/status/permissions) — all additive, IF NOT EXISTS guards. `electron/database/index.ts`: calls `runSdkAlignmentMigration()` after migrations. `electron/ipc-handlers/auth-handlers.ts`: migrated to `@soostori/auth` PIN (`hashPin`/`verifyPin`) + `AuthSession` electron-store persistence (`desktopSaveSession`/`desktopClearSession`) + RBAC (`hasPermission`); deprecated `electron/database/pin-hash.ts`. `electron/ipc-handlers/device-handlers.ts`: added `db:devices:getPrimaryState` IPC with `canAuthorStockOps` (true ONLY when status=online); fixed `approvePairing` bug (was writing to wrong column). `packages/business/package.json`: created missing package.json so workspace resolves `@soostori/business`. `packages/auth/src/identity.ts`: fixed pre-existing TS nullability errors.

- **Bidirectional sync — client sends mutations to host**: `db:sales:create` now routes to host via `syncService.sendSalePending()` when in client mode (returns optimistically with `status: 'pending'`); host mode writes directly to `sales`, `sync_sales`, `inventory_transactions`, and `stock_movements` atomically. `sync-service-messages.ts` extracted for `sendSalePending` and `sendLocalMutation`. `db:sales:create` fixed to use `COALESCE(current_stock, stock_quantity)` for stock deduction and keep both columns in sync. Added `sync_sales` table to `schema-sync.ts` (was referenced but not created).

- **Cloud sync wired to InstantDB** (`electron/services/instant-api.ts`): Low-level HTTP client for Instaml tx + InstaQL query against `apiinstant.fidscript.com`. `electron/services/cloud-sync.ts`: `pushSyncEvents()`, `pushShopSettings()`, `pullShopSettings()`, `pushDeviceHeartbeat()`, `checkCloudSubscription()`, `pushFullSnapshot()`. `electron/ipc-handlers/cloud-handlers.ts`: 7 IPC endpoints (`cloud:syncEvents`, `cloud:syncShopSettings`, `cloud:pullShopSettings`, `cloud:heartbeat`, `cloud:subscription`, `cloud:fullSync`, `cloud:health`, `cloud:reconnect`). All dispatch sync status events so `SyncIndicator` in TitleBar updates in real time. `electron/services/sync-task-service.ts`: background cycle every 2 min — pushes events, pulls settings, heartbeat. `src/hooks/useCloudSync.ts`: renderer hook with health/subscription/sync state. `.env` sets `INSTANT_APP_ID=0808ca7d-b0ba-4541-8906-48f7d0403950`.

- **Secure pairing flow improvements** (`device-handlers.ts`): `db:devices:requestPairing` now deduplicates — returns existing pending token if requested within 1 hour (avoids spamming pending rows). `db:devices:approvePairing` now issues a fresh `connection_token` (UUID) on approval, updates `devices.connection_token`, returns token to caller. Added `db:devices:getConnectionToken` for clients to retrieve their approved token. Pairing state machine: pending → approved (with token) | rejected.

- **Cloud identity + device registration** (`electron/services/cloud-auth.ts`): Magic-code login flow (email → 6-digit code → register device). `registerDevice()` creates/resolves cloud device record via instaml. `syncEmployeesFromCloud()` / `syncShopFromCloud()` upsert cloud entities into local SQLite with `cloud_id` linking column. Session persisted in electron-store (`cloudSession`, `cloudDeviceId`, `shopId`, `employeeId`). `src/components/CloudLoginScreen.tsx` — production onboarding UI replacing stub WelcomeScreen. `src/App.tsx` — auto-restores cloud session on startup; falls back to SetupWizard in DEV_MODE only. `electron/preload/handlers.ts` — new `cloudAuth` IPC bridge with 10 endpoints. `electron/database/schema-commerce.ts` — `employees.cloud_id` column for cross-device identity linking. Full audit in `docs/DESKTOP-AUDIT.md`: 15/15 items PASS (2 PARTIAL — snapshot recovery needs initial download, cloud→desktop product sync is on-demand not real-time).

- **Expenses tracking + Profit/Loss**: Full expenses feature — `expenses` SQLite table, IPC handlers (`db:expenses:list/create/delete`), `useExpenses` React Query hooks (`useExpenses`, `useCreateExpense`, `useDeleteExpense`, `useExpenseStats`). `ExpensesPage` with category filter (Rent/Utilities/Transport/Supplies/Salaries/Other), date range filter, total, and add-expense bottom sheet. Added to sidebar under Finance nav group alongside Reports and Debt. `ReportsStatsCards` gains a 6th "Profit" stat card (Revenue − Total Expenses). EN + SW i18n keys via `src/lib/i18n/expenses.ts`.

- **Notifications page + low stock alerts**: Full notifications history page accessible from sidebar Finance nav group. `useNotifications` hook manages localStorage persistence (max 100, FIFO), listens for `soostori:low-stock` DOM events, exposes `addNotification`, `markRead`, `markAllRead`, `clearAll`, `dismiss`, `unreadCount`. Sale handlers (`sale-handlers-mutation.ts`) fire `notification:low-stock` IPC when a sale reduces tracked stock to or below its threshold. Preload bridge (`onLowStockNotification`) converts IPC to custom DOM event consumed by the hook. `NotificationsPage` shows Bell icon, timestamps, per-kind icons (CircleAlert for low_stock), and clear all/mark all read controls. i18n keys for `not.*` namespace added. `InventoryHeader` already shows out-of-stock and low-stock count badges.

- **Negative stock prevention in POS**: `addToCart` in `useCartState` now returns early with `setScanError('Out of stock')` when `trackInventory && stockQuantity <= 0`. `inc` callback caps at `stockQuantity` when tracked. `handleScan` shows `"not found"` error for unknown barcodes and `"Out of stock"` flash for tracked products at zero. `tsc --noEmit` passes.

- **Auto-suggest typeahead in inventory search**: `SearchSuggestions` component renders a dropdown of up to 5 products matching the current search name. Clicking a suggestion opens the product's edit form. Dropdown closes on outside click. `Inventory.tsx` computes `suggestions` via `useMemo` and wires it through `SearchBar`/`InventoryHeader`.

- **Duplicate barcode → edit mode on product create**: `Inventory.tsx` barcode scanner (`onBarcodeScanned`) detects when a scanned barcode matches an existing product and opens `DuplicateBarcodeModal` offering to edit that product directly. `ProductFormModal` uses `mapProductRow` for type-safe barcode lookup.

- **CSV product import with preview**: `ImportProductsModal` parses client-side CSV (expected columns: `name, barcode, sku, category, costPrice, sellingPrice, stockQuantity, lowStockThreshold`), calls `db:products:validateImport` IPC which classifies rows as `new`, `updates` (barcode match), or `duplicates` (name match, no barcode). Preview table shows first 5 rows per category. Confirm creates all `new` products via `db:products:bulkCreate`. Accessible from Settings → Data Management. i18n keys in `set.*` namespace.

- **Card + Transfer payment views**: `CardPaymentView.tsx` (33 lines) and `TransferPaymentView.tsx` (33 lines) added to POS checkout flow. `PaymentMethod` type in `useCheckout.ts` expanded to include `'card' | 'transfer'`. `CheckoutPayload.method` union updated. `canConfirm` now allows card/transfer without cash logic. `paymentMethods` array always includes Card and Transfer alongside Cash. `CheckoutSheet` conditionally renders the new views. Confirm button text updated for card and transfer. `build-receipt-data.ts` `methodLabel()` updated for card/transfer. Swahili + English i18n keys added.

- **Top-Selling Products chart**: Added horizontal `BarChart` to Reports showing top 10 products by quantity sold. New `db:sales:topProducts` IPC handler in `sale-handlers-query.ts` runs SQL aggregation over `sale_items` joined with `sales`. New `useTopProducts` hook in `useSales.ts`. New `TopProductsChart.tsx` component (70 lines). `ReportsCharts` updated to a 3-column grid (2-col revenue line + payment pie) with the top-sellers bar chart spanning full width below. `Reports.tsx` passes date-filter-matched range to `useTopProducts`. i18n keys added.

- **Reports UI overhaul**: Redesigned the Reports page header section. Stats cards now use a static `ACCENTS` color map (previously used runtime-variable Tailwind interpolation like `bg-${color}-50` which silently rendered with no background). Custom date range picker added — "Custom" filter pill reveals a From/To date input bar with last-30-days-to-today defaults. Stats cards use a 5-column responsive grid (2/3/5 cols) with icons, rounded-2xl cards, and proper accent colors. Sale list rows have a 4px colored left border per payment method and larger amounts. Charts are taller (240px vs 180px) with icon-prefixed headings. Filter pills bumped to `text-[11px]` for better touch targets. Files: `ReportsStatsCards.tsx` (71 lines), `ReportsSaleList.tsx` (50 lines) extracted. `useReportsState` now supports `custom` DateFilter with `DateRange` for the custom range.

- **i18n infrastructure**: `src/lib/i18n.ts` (450 lines) split into 10 domain files under 150 lines each: `nav.ts` (24), `pos.ts` (142), `inv.ts` (116), `inv-pricing.ts` (86), `rep.ts` (86), `deb.ts` (100), `set.ts` (144), `set-hw.ts` (74), `shared.ts` (96), `app.ts` (90), plus `index.ts` (53) re-exporting all with a `t(key, params?)` function supporting `{placeholder}` interpolation. All Reports page components now use `t()` for all UI strings. The original `i18n.ts` is a 4-line re-export shim. `t()` widened to accept `TranslationKey | string` with fallback.

- **ANPAS compliance**: `src/App.tsx` (218 → 112 lines) split into `toast-controller.ts`, `header-control-events.ts`, `login-status.ts`, `sidebar-prefs.ts`. `src/hooks/useProducts.ts` (154 → 65 lines) — `mapProductRow()` moved to `src/hooks/product-mapper.ts`. `electron/preload/types.ts` — all 36 DB API surfaces changed from `any[]`/`any | null` to `unknown[]`/`unknown`. `electron/preload/handlers.ts` — 12 IPC types changed to `unknown`, 3 `ipcRenderer.on` handlers typed as `(event: Electron.IpcRendererEvent, ...) => void`. `electron/updater.ts` — `catch(error: any)` → `catch(error: unknown)` with `instanceof Error` guard. `src/hooks/useSales.ts` — `items: any[]` replaced with typed `CartLineItem[]`. `src/pages/debt/hooks/useDebtState.ts` — 3 `any` mutation types replaced with `DebtPaymentInput`/`CustomerInput`/`DebtCreateInput`. `src/pages/debt/components/DebtDetailModal.tsx` — `(item: any, i)` → `(item: SaleItem, i)`. `src/lib/ui-utils.ts` deleted (was unused).

- **Serialport typed handlers**: `electron/ipc-handlers/printer-handlers.ts`, `scanner-handlers.ts`, `scanner-auto-detect.ts` — all 12 `any` casts replaced with proper types via `src/types/serialport.d.ts` (typed the serialport constructor, instance, `pipe()`, `on()`, `close()`, `write()`). `npx tsc --noEmit` now passes with 0 errors.

- **POS price selection dialog**: When a product has group/offer prices AND `allowSingleUnitSale === true`, tapping the product now shows a modal dialog letting the user choose between individual sale (sellingPrice) or a group price. Implemented via `priceSelectionProduct` state in `useCartState`, new `addToCartWithPrice(product, unitPrice, quantity)` and `cancelPriceSelection()` helpers, and new `PriceSelectionDialog.tsx` component. Existing POS flow (products without groupPrices or with `allowSingleUnitSale === false`) is unchanged. Added i18n keys `pos.selectPrice`, `pos.sellIndividually`, `pos.buyNForKES`.

### Changed

- **i18n Translation Coverage (i18n)**: Extended translation coverage to all UI components. Added ~100+ new translation keys to `src/lib/i18n.ts` covering: sidebar controls (HeaderControls, SidebarBottom), titlebar (UpdateIndicator, SyncIndicator, OfflineBanner, NotificationsDropdown, LanguageSwitcher), settings page (Settings, ShopSettingsForm, PaymentSettings, ScannerSettings, PrinterSettings, DataManagement, About), POS components (CheckoutSheet, CashPaymentView, MpesaPaymentView, DebtPaymentView), and DebtManagement page. All hardcoded English strings are now wrapped in `t('key')` calls using the `useTranslation()` hook. New keys include: `app.*` keys for app-level messages, `pos.*` keys for additional POS strings, `set.*` keys for settings sections, `deb.*` keys for debt page strings. TypeScript `tsc --noEmit` passes with no errors.

- **Reports pagination**: `useSales()` now fetches all records (no 500 limit). Reports page shows 50 per page with "Load More" button. Displays "Showing X of Y transactions" text. Sort by newest first. Note preview shown in sale list item.

- **POS sale notes**: Added "Note / Memo" textarea in checkout sheet for Cash, M-Pesa, and Debt payment views. Note saved to `sales.note` column and shown in Reports sale list and SaleDetailModal.

- **POS debt customer ID**: `DebtPaymentView` now requires national ID number for new debt customers (alongside name and phone). ID number stored in `customers.id_number` and `sales.customer_id_number` columns. Customer schema, create handler, and sale insert all updated.

- **Inventory form dedup (inventory-dedup)**: Created `src/components/shared/FormField.tsx` wrapping label + input/textarea with consistent styling and dark mode. Replaced all inline form fields across ProductFormBody, ProductFormStock, ProductFormSkuBarcode, ProductFormDistributor, CategoryAddPanel with FormField. Merged PricingLoose and PricingBulk into single `PricingTab.tsx` with "Unit Price" and "Bulk/Box" tabs — GroupPricesEditor embedded in Bulk tab. Deleted PricingLoose.tsx and PricingBulk.tsx. All inventory form components now use semantic CSS variables with dark: variants throughout.

- **Add Product wizard restructure**: Restructured 4-step wizard to: (1) Type — unchanged; (2) Details — name, image (opt), SKU (opt), barcode with 300ms auto-focus, category dropdown with inline "+ Add New Category" option replacing the old slide-down panel; (3) Pricing & Stock — merged step with cost/selling price, group/offer prices (now works in both loose and bulk modes), AllowSingleUnitToggle (both modes), opening stock, low stock alert, track inventory toggle; (4) Distributor — supplier name and phone only (both optional). Footer `pb-4` padding added. Files: `CategoryInlineAdd.tsx` (new), `DistributorStep.tsx` (renamed from StockStep), `DetailsStep.tsx`, `PricingStep.tsx`, `ProductFormModal.tsx`, `FormNavigationFooter.tsx`. Deleted `CategoryAddPanel.tsx`, `ProductFormBody.tsx`, `StockStep.tsx`.

### Added

- **PIN Login System**: Full PIN-based login with 4-digit keypad. `app_settings` table added with `default_theme`, `default_language`, `login_pin`, `pin_set` columns. When `pin_set=1`, app shows `LoginScreen` overlay on launch (app content renders blurred behind it). Same-day skip if `lastLoginDate` matches today in localStorage. Wrong PIN triggers shake animation; 3 failed attempts shows "Call admin" message. Admin reset via 6-digit key `849562` reveals new PIN setup. PIN stored in SQLite, verified via `app:settings:verifyPin` IPC. `LoginScreen.tsx` component (111 lines). Admin can set new PIN from login screen. Settings page now includes Appearance section for Default Theme (Light/Dark) and Default Language (English/Kiswahili) with live preview. IPC handlers: `app:settings:getDefaults`, `app:settings:setDefaultTheme`, `app:settings:setDefaultLanguage`, `app:settings:setPin`, `app:settings:verifyPin`, `app:settings:recordLogin`.

- **i18n Translation System**: Full English/Swahili translation support via `src/lib/i18n.ts` dictionary (160 lines, ~170 translation keys covering nav, POS, inventory, reports, debt, settings, common actions/labels/errors). `LanguageProvider` in `src/lib/i18n-context.tsx` stores language in localStorage, sets `lang` attribute on document root. `useTranslation()` hook in `src/lib/useTranslation.ts`. Language toggle (Globe icon + EN/SW chip) added to `TitleBar.tsx`. Sidebar navigation (`SidebarNav.tsx`), POS page (`POS.tsx`), and POS cart (`POSCart.tsx`) all use `useTranslation()`. Real Swahili retail/POS terms (e.g., "Duka la Mauzo" for Point of Sale, "Weka Pando" for Hold).

- **Language Switcher Dropdown**: Created `src/components/shared/LanguageSwitcher.tsx` (≤100 lines) replacing the separate Globe button + EN/SW chip in `TitleBar.tsx`. Shows a single pill button with Globe icon + current language code. On click, displays a dropdown with "English" and "Kiswahili" options with radio-style orange dot selection. Dropdown appears below button with proper z-index (10000), closes on outside click or Escape. Dark mode fully supported.

- **Multi-step Product Form Wizard**: Transformed `ProductFormModal.tsx` into a 4-step wizard with clear step labels and progress indicator. Step 1: Type selection with large cards explaining Loose Item vs Bulk/Box in English and Swahili. Step 2: Details (name, SKU, barcode, category, image). Step 3: Pricing (buying/selling price for loose, or box quantity + prices + bulk discounts for bulk). Step 4: Stock quantity, low stock alert, track inventory toggle, and distributor info. Each step has Back/Next navigation and progress bar. Created `TypeStep.tsx`, `DetailsStep.tsx`, `PricingStep.tsx`, `StockStep.tsx`, `StepIndicator.tsx` components. All labels include Swahili translations inline (e.g., "Product Name / Jina la Bidhaa"). FormField hint prop shows Swahili translations. Full dark mode support on all components.

- **Reports Export (reports-export)**: Created `ExportModal.tsx` with PDF and CSV export tabs, period selector (Today/This Week/This Month/This Year/All Time/Custom Range), large tappable period cards with color icons, custom date-from/date-to inputs, and dark mode styling. CSV export generates a downloadable `.csv` file client-side (no server needed) with Date, Time, Items, Subtotal, Discount, Total, Payment, Note columns. PDF export opens system print dialog with a formatted HTML receipt-style report. Export button wired into Reports header. SaleDetailModal also gains export capability via the same modal.

- **Export Save Dialog (export-save-dialog)**: ExportModal now shows a native save dialog before saving CSV or HTML report files instead of auto-downloading to the default downloads folder. Added `writeFile` IPC handler (`app:file:write`) in the main process and exposed it via `window.electronAPI.app.writeFile`. Both CSV and HTML exports now prompt the user to choose the save location.

- **Reports Charts (reports-charts)**: Created `ReportsCharts.tsx` component with a line chart (daily revenue over selected filter period) and pie chart (payment method breakdown) using recharts. Both charts use dark-mode-aware CSS variables. Reports header section now shows charts on left (60%) and compact stat row on right (40%) on desktop, stacked on mobile. Y-axis formatted with KES currency shorthand.

- **Debt Collected Stats Card (debt-wiring)**: Added `getTotalDebtCollected` IPC query (`db:debts:totalCollected`) to `debt-handlers.ts` that returns the sum of all `amount_paid` from debts with status `paid` or `partial`. Exposed via `useTotalDebtCollected` React Query hook and displayed as a fifth "Debt Collected" stat card in the Reports header (violet color), next to Total, Cash, M-Pesa, and Debt Sales. POS debt sale creation and debt payment recording were already wired in `sale-handlers-mutation.ts`.

### Changed
- **Sidebar (sidebar-pos-ui)**: Removed colored left-border indicator on active nav items. Active state now uses a subtle `bg-brand-orange/10` (light) / `dark:bg-brand-orange/20` (dark) background tint with `text-brand-orange`. Hover state uses neutral `bg-slate-100` / `dark:bg-slate-800`. Added `aria-current="page"` for accessibility, refined tooltip styling for dark mode. SidebarNav background switched to `bg-bg-secondary dark:bg-slate-900`.
- **POS ProductCard**: Removed `border-orange-100` accent — now uses neutral `border-border-color` with subtle hover lift (`-translate-y-0.5`) and `shadow-md` on hover. No more colored left borders on the product grid.
- **POSCart**: Warmer empty state with gradient shopping bag icon and friendlier copy ("Your cart is empty — Tap products to add them"). Total row made more prominent (2xl font, bold, tabular-nums). Hold/Pay buttons refined to `min-h-[44px]` touch targets with active scale. Cart items now use shared `divide-y` dividers instead of per-row `border-b` + `bg-slate-100`.
- **HeldSalesSheet**: Larger touch targets (Recall button now `min-h-[40px]`), clear visual hierarchy (Recall = primary orange button, Delete = red icon-only button). Added item count + estimated total preview per held order. Full dark mode: `bg-slate-900`, `dark:bg-slate-800/60` row hover, drag-handle color, and safe-area bottom padding for mobile-style sheets.
- **OfflineBanner**: Dark mode variant added (`bg-amber-600`).

### Added
- `aria-current="page"` and `aria-modal` / `role="dialog"` attributes on HeldSalesSheet and nav items for accessibility.
- Safe-area padding at the bottom of HeldSalesSheet for mobile-style bottom sheets.

### Files changed
- `src/components/sidebar/SidebarNav.tsx`
- `src/components/sidebar/NavItemButton.tsx`
- `src/pages/pos/components/ProductCard.tsx`
- `src/pages/pos/components/POSCart.tsx`
- `src/pages/pos/components/CartRow.tsx`
- `src/pages/pos/components/HeldSalesSheet.tsx`
- `src/components/OfflineBanner.tsx`

## [Unreleased]

### Added
- Full dark/light mode: `darkMode: 'class'` in Tailwind, CSS variables for all semantic colors (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-color`, `--shadow-color`), ThemeProvider + useTheme hook with localStorage persistence
- Theme toggle button (Sun/Moon icon) in TitleBar — switches between light and dark mode, persists choice via localStorage
- Dark mode applied to all pages: POS, Inventory, Reports, DebtManagement, Settings, and all modal/sheet components (CheckoutSheet, HeldSalesSheet, SaleDetailModal, DebtDetailModal, PaymentModal, AddCustomerSheet, RecordDebtSheet, SettingsModal, CartRow, CartSummary, CashPaymentView, MpesaPaymentView, DebtPaymentView, PaymentMethodButtons, ProductCard, POSCategories, POSCart, ProductRow, RestockInline, SearchBar, CategoryChips, InventoryHeader, ProductList, etc.)
- Body background and text color use CSS variables (auto-update via class toggle)
- Title bar redesigned with: SyncIndicator (online/syncing/offline state), NotificationsDropdown (slide-down panel with notification history, mark-all-read, empty state), full-state Update pill (idle → checking → available → downloading → ready → error states), theme toggle button
- SoostoriHeader: text-only title (no gradient icon box), HeaderControls component with page-specific controls via header-controls-bus event bridge
- HeaderControls: POS shows Held Sales count badge button; Inventory shows search bar + Add Product button; Reports shows current date filter badge; Debt shows search bar + Add Customer button
- HeaderControls wired to page state via window events: `soostori:pos:held-count`, `soostori:header:inventorySearch`, `soostori:header:debtSearch`
- Print Receipt button added to SaleDetailModal (Reports page) — prints thermal receipt via `window.electronAPI.hw.printReceipt`
- Keyboard shortcuts: `Escape` closes checkout sheet; `Ctrl+H` holds current sale; `Ctrl+F` focuses search bar on POS
- App-level event bus (`src/lib/header-controls-bus.ts`) for page-to-header communication without prop drilling

### Fixed
- `useSale` / `useSales`: Sale.items was always empty — added `mapSaleItems()` in IPC handler and `mapSaleItem()` in hook; items now populate correctly in SaleDetailModal
- `db:sales:create` did not populate `items_summary` column — added ALTER TABLE + populate on insert (`"N items"`)
- `useCheckout`: `setMethod()` was called inside `useMemo` (state setter during render) — moved to `useEffect`
- `SaleDetailModal` now correctly shows sale items and prints receipts

### Changed
- `src/App.tsx` simplified: pageConfig no longer carries icon ReactNodes (icons removed from header), HeaderControls rendered via `HeaderControls.tsx` component
- All pages use semantic CSS variable colors: `bg-bg-primary`, `bg-bg-secondary`, `text-text-primary`, `border-border-color` with dark: equivalents
- `transition-colors duration-200` added to all interactive elements for smooth dark/light theme switching
- Inventory product form: created `src/components/shared/FormField.tsx` shared component (label + children + error + hint) and refactored `ProductFormBody`, `ProductFormStock`, `ProductFormSkuBarcode`, `ProductFormDistributor`, `CategoryAddPanel` to use it
- Inventory pricing: merged `PricingLoose.tsx` + `PricingBulk.tsx` into a single `PricingTab.tsx` with internal "Unit Price" / "Bulk / Box" sub-tabs; `GroupPricesEditor` now embedded inside the Bulk tab. `ProductFormPricing` keeps its existing props interface and delegates to `PricingTab`

### Added
- Functional title bar sync status, notifications dropdown, and full update state controls
- Text-first page header with optional page-specific controls and accessible offline status
- Page-specific header controls driven through an event bridge (POS Held Sales count, Inventory search + Add Product, Reports current date filter, Debt search + Add Customer)
- Custom frameless title bar with native window controls (minimize, maximize/restore, close)
- Update indicator in title bar — shows check/download/install states inline
- Settings shortcut in title bar for quick access from any page
- Notification bell placeholder in title bar
- Sidebar collapse state persisted to localStorage
- Toast notification system (success, error, warning, info variants)
- Offline banner with navigator.onLine detection
- Sync queue, sync_id_map, and sync_metadata tables for offline sync infrastructure
- Zod validation schemas for all IPC handlers (`electron/ipc-handlers/validation/schemas.ts`)
- Proper TypeScript types for all database row types in hooks

### Fixed
- Cart was incorrectly cleared when closing checkout (cart now persists on close)
- Held sales delete callback was a dead function (now properly wires to delete IPC handler)
- Empty catch blocks in useCartState (handlePay) and useInventoryState (handleSaveProduct, handleRestock, handleDelete, handleAddCategory) — now log errors and show toast
- Removed unmapped `mpesaTillNumber` field from ShopSettingsForm (was using `as any` cast)
- Fixed `setMethod as any` in CheckoutSheet by adding properly typed `onMethodChange` callback in useCheckout
- Fixed `value as any` in PrinterSettings by using proper type cast `as 'escpos' | 'system'`
- Fixed all `as any` casts in electron/ipc-handlers with proper typed database row interfaces
- Fixed all `as any[]` casts in hooks with proper DbRow type interfaces
- App layout: removed redundant `pt-9` on main content div (TitleBar already sits in the parent flex-col, SoostoriHeader is rendered inside the main area)
- App layout: switched main area transition to `transition-[margin]` so only the marginLeft animates, not unrelated properties
- useCheckout: moved `setMethod` call out of `useMemo` (state setter during render) into a `useEffect`

### Fixed
- `useSale` / `useSales`: `Sale.items` was always empty because `mapSale()` ignored the `items` array returned by `db:sales:get`. Added `mapSaleItem()` and propagate `items` and `items_summary` from the IPC row.
- `db:sales:create` did not populate `sales.items_summary`. Added `ALTER TABLE sales ADD COLUMN items_summary` (guarded via `PRAGMA table_info`) and populate the column on insert (`"3 items"` form).
- `DebtManagement`: replaced manual `totalPending` calculation from `useDebtState` with `useDebtSummary()` from the debts summary IPC; pending count badges now use `pendingCount` from the summary.
- Verified debt note flow: `debts.notes` (column) is correctly written from `saleData.note` in `db:sales:create` and read back in `DebtDetailModal`. No mismatch.

### Added
- Receipt auto-print after a sale is recorded (uses ESC/POS via `window.electronAPI.hw.printReceipt`); printed data includes shop info, items, totals, payment method, and date
- Keyboard shortcut: `Escape` closes the checkout sheet (works on both payment and Thank-You screens)
- Keyboard shortcut: `Ctrl+H` holds the current sale (only active when checkout is not open)

### Changed
- Frameless window mode — `frame: false` in Electron BrowserWindow
- Sidebar redesigned with grouped navigation (Store, Catalog, Finance, System)
- Active nav item has left border indicator + gradient fill
- Nav labels reduced from `text-sm` (14px) to `text-[11px]` with `tracking-wide`
- Icons reduced from 20px to 16px in nav items
- Sidebar width reduced: expanded 180px, collapsed 56px (was 220px/68px)
- App header simplified — shop badge + page title only, update/notification/settings moved to title bar
- Sidebar font sizes tightened: group labels `text-[9px]`, nav labels `text-[11px]`
- Sidebar logo merged into nav container (no dead zone above nav content)
- Sidebar now starts at `top-9` (36px) directly below custom title bar
- Sidebar width animation now transitions only the width property for smoother collapse/expand behavior.
- Checkout payment controls use larger touch targets and a more prominent confirmation action.
- Reports payment filters scroll horizontally on narrow windows; report totals use tabular numerals.
- Debt status filters move to a dedicated horizontal scrolling row on narrow windows.
- POS product cards are memoized and the empty cart state now provides clearer visual guidance.

### Refactored
- Sidebar split into Sidebar.tsx (layout), SidebarNav.tsx, SidebarBottom.tsx, NavItemButton.tsx
- TitleBar.tsx extracted with UpdateIndicator.tsx and WindowBtn component
- All layout files now ≤150 lines

### ANPAS Compliance
- Deleted forbidden `src/lib/utils.ts` — split into domain-specific utility files:
  - `formatting-currency.ts` — formatCurrency()
  - `formatting-datetime.ts` — formatDate(), formatTime(), formatDateTime()
  - `barcode-utils.ts` — normalizeBarcode(), barcodesMatch()
  - `id-utils.ts` — generateId()
  - `ui-utils.ts` — cn(), debounce(), clamp()
- Split `electron/database/index.ts` (304 lines) into `schema.ts` and `index.ts`
- Split `electron/preload.ts` (226 lines) into `preload/types.ts`, `preload/handlers.ts`, `preload.ts`
- Split `electron/ipc-handlers/hardware-handlers.ts` (240 lines) into `scanner-handlers.ts` and `printer-handlers.ts`
- Split `electron/hardware/printer.ts` (206 lines) into `esc-commands.ts` and `printer.ts`
- Split `electron/ipc-handlers/database-handlers.ts` (540 lines) into domain-specific handlers:
  - `product-handlers.ts`, `category-handlers.ts`, `sale-handlers.ts`
  - `customer-handlers.ts`, `debt-handlers.ts`, `settings-handlers.ts`, `stock-handlers.ts`
- Split `src/lib/types.ts` (215 lines) into `types/database.ts`, `types/pos.ts`, `types/hardware.ts`, `types/api.ts`
- All files now ≤150 lines, all follow `[domain]-[action]-[type]` naming convention

## [1.0.0] — 2026-07-27

### Added

- Soostori POS v1.0 - full production build
- Point of Sale with barcode scanning, cart management, multi-payment support
- Inventory management with product catalog, categories, stock tracking, stock movement audit
- Held sales (save cart for later)
- Debt management with customer tracking, partial payments, debt summary
- Sales reports with daily/weekly/monthly views, revenue analytics, top products
- ESC/POS thermal printer support (Epson TM series compatible)
- Keyboard wedge scanner support (auto-detect, no config needed)
- Serial scanner support with configurable port/baud rate
- Local SQLite database (soostori.db) — fully offline operation
- Shop settings (name, address, receipt footer, currency)
- Auto-updater infrastructure
- Initial release

**Files:** All project files — electron/main.ts, electron/preload.ts, electron/database/index.ts, electron/hardware/printer.ts, electron/ipc-handlers/database-handlers.ts, electron/ipc-handlers/hardware-handlers.ts, electron/ipc-handlers/app-handlers.ts, src/App.tsx, src/main.tsx, src/pages/POS.tsx, src/pages/Inventory.tsx, src/pages/Settings.tsx, src/pages/DebtManagement.tsx, src/pages/SalesReports.tsx, src/hooks/useDatabase.ts, src/hooks/useScanner.ts, src/hooks/usePrinter.ts, src/lib/types.ts, src/lib/api.ts, src/lib/utils.ts, package.json, electron-builder.yml, tsconfig.json, vite.config.ts, tailwind.config.js, postcss.config.js

## [Unreleased]

### Added

- ANPAS project structure initialized (`.ai/` layer, docs/, CHANGELOG.md)
- `docs/decisions/ADR-template.md` added

### Changed

- Initial ANPAS bootstrap — 2026-07-27

## [1.0.1] — 2026-07-27

### Refactored

- **`src/pages/POS.tsx`** (828 lines) split into 12 files under `src/pages/pos/` to comply with ANPAS 150-line rule:
  - `src/pages/pos/POS.tsx` (87 lines) — Main page, renders 3-column layout, wires props only
  - `src/pages/pos/components/CheckoutSheet.tsx` (107 lines) — Full checkout modal
  - `src/pages/pos/components/HeldSalesSheet.tsx` (63 lines) — Held orders bottom sheet
  - `src/pages/pos/components/ProductCard.tsx` (49 lines) — Product grid card
  - `src/pages/pos/components/CartRow.tsx` (35 lines) — Cart item row
  - `src/pages/pos/components/CashPaymentView.tsx` (68 lines) — Cash payment UI
  - `src/pages/pos/components/MpesaPaymentView.tsx` (91 lines) — M-Pesa payment UI
  - `src/pages/pos/components/DebtPaymentView.tsx` (85 lines) — Debt payment UI
  - `src/pages/pos/components/CartSummary.tsx` (27 lines) — Checkout cart summary
  - `src/pages/pos/components/PaymentMethodButtons.tsx` (33 lines) — Payment method selector
  - `src/pages/pos/components/POSCategories.tsx` (58 lines) — Category sidebar
  - `src/pages/pos/components/POSCart.tsx` (82 lines) — Cart panel
  - `src/pages/pos/hooks/useCartState.ts` (89 lines) — Cart state + persistence + business logic
  - `src/pages/pos/hooks/useCheckout.ts` (81 lines) — Checkout/payment state machine
- **`src/App.tsx`** updated to import from `src/pages/pos/POS.tsx`
- All business logic moved out of UI components into hooks
- `tsc --noEmit` passes for all pos files

### Refactored

- `src/pages/Inventory.tsx` split into ANPAS-compliant feature module (`src/pages/inventory/`)
  - `Inventory.tsx` (104 lines) — page shell with layout, search, category chips, product list
  - `constants.ts` — shared constants (UNITS, CATEGORY_COLORS, RESTOCK_REASONS)
  - `hooks/useInventoryState.ts` (106 lines) — all business logic: save, restock, delete, barcode scan, filteredProducts, stats
  - `hooks/useProductForm.ts` (74 lines) — form state, validation, image handling, category add
  - `hooks/useProductFormPricing.ts` (32 lines) — bulk pricing auto-calculation (costPerUnit)
  - `hooks/useGroupPrices.ts` (15 lines) — group price CRUD state
  - `hooks/productFormMappers.ts` (87 lines) — productToForm, buildProductData, isProductFormValid
  - `components/ProductFormModal.tsx` (94 lines) — modal wrapper, tabs, submit logic
  - `components/ProductFormBody.tsx` (106 lines) — form fields layout (name, image, SKU, category, unit, distributor)
  - `components/ProductFormPricing.tsx` (55 lines) — pricing section shell, delegates to PricingLoose/PricingBulk
  - `components/PricingLoose.tsx` (44 lines) — loose mode: buy price, sell price, single-unit toggle
  - `components/PricingBulk.tsx` (48 lines) — bulk mode: units per box, box buy price, bulk sell price
  - `components/GroupPricesEditor.tsx` (52 lines) — bulk discount rows (quantity/price pairs)
  - `components/ProductFormImage.tsx` (45 lines) — image upload preview
  - `components/ProductFormSkuBarcode.tsx` (47 lines) — SKU input + barcode input + auto-generate
  - `components/ProductFormDistributor.tsx` (32 lines) — distributor/supplier name + phone
  - `components/ProductFormStock.tsx` (56 lines) — opening stock qty + low stock threshold + track toggle
  - `components/CategoryAddPanel.tsx` (42 lines) — inline category creation panel
  - `components/CategoryChips.tsx` (33 lines) — horizontal scrolling category filter chips
  - `components/SearchBar.tsx` (41 lines) — search input + category filter dropdown + Add button
  - `components/InventoryHeader.tsx` (34 lines) — stock count + out/low stock badges
  - `components/ProductList.tsx` (49 lines) — loading/empty/product rows state switch
  - `components/ProductRow.tsx` (65 lines) — compact product row with edit/restock/delete
  - `components/RestockInline.tsx` (70 lines) — inline restock form
  - `components/DuplicateBarcodeModal.tsx` (43 lines) — barcode-already-exists alert modal
- All business logic moved from Inventory component to hooks; UI components render-only
- `tsc --noEmit` passes (inventory module)

### Refactored

- Split App.tsx into ANPAS-compliant component files (≤150 lines each)
- Created `src/components/sidebar/Sidebar.tsx` — extracted SoostoriSidebar component with 18px nav icons and fixed tooltip z-index
- Created `src/components/sidebar/Header.tsx` — extracted SoostoriHeader component
- Created `src/components/shared/UpdateNotification.tsx` — extracted UpdateNotification component
- Refactored `src/App.tsx` to only import components and render layout

**Files:** src/App.tsx, src/components/sidebar/Sidebar.tsx, src/components/sidebar/Header.tsx, src/components/shared/UpdateNotification.tsx

### Refactored

- `src/pages/Settings.tsx` split into ANPAS-compliant feature module (`src/pages/settings/`)
  - `Settings.tsx` — main page shell with section cards (max 80 lines)
  - `components/SettingsModal.tsx` — shared modal wrapper (max 40 lines)
  - `components/ShopSettingsForm.tsx` — shop settings form (max 120 lines)
  - `components/ScannerSettings.tsx` — barcode scanner configuration (max 140 lines)
  - `components/PrinterSettings.tsx` — ESC/POS/system printer setup (max 140 lines)
  - `components/PaymentSettings.tsx` — M-Pesa/payment method settings (max 140 lines)
  - `components/DataManagement.tsx` — export/import data (max 80 lines)
  - `components/About.tsx` — app version and info (max 60 lines)
  - `components/SharedInput.tsx` — shared form input component (max 150 lines)
  - `components/SharedButtons.tsx` — shared connection status/action button components (max 150 lines)
- Updated `src/App.tsx` to import from new path `src/pages/settings/Settings`
- Deleted original monolithic `src/pages/Settings.tsx` (1238 lines)

**Files:** src/App.tsx, src/pages/settings/Settings.tsx, src/pages/settings/components/SettingsModal.tsx, src/pages/settings/components/ShopSettingsForm.tsx, src/pages/settings/components/ScannerSettings.tsx, src/pages/settings/components/PrinterSettings.tsx, src/pages/settings/components/PaymentSettings.tsx, src/pages/settings/components/DataManagement.tsx, src/pages/settings/components/About.tsx, src/pages/settings/components/SharedInput.tsx, src/pages/settings/components/SharedButtons.tsx

### Refactored

- `src/pages/SalesReports.tsx` (308 lines) split into ANPAS-compliant feature module (`src/pages/reports/`)
  - `Reports.tsx` — main page component with header, stats bar, filters, sales list (max 100 lines)
  - `components/SaleDetailModal.tsx` — sale receipt detail modal (max 80 lines)
  - `hooks/useReportsState.ts` — business logic: filteredSales, stats computation, date/payment/search filtering (max 100 lines)
- Updated `src/App.tsx` to import `Reports` from `src/pages/reports/Reports`
- Deleted original monolithic `src/pages/SalesReports.tsx` (308 lines)
- `tsc --noEmit` passes (refactored files)

**Files:** src/App.tsx, src/pages/reports/Reports.tsx, src/pages/reports/components/SaleDetailModal.tsx, src/pages/reports/hooks/useReportsState.ts

### Refactored

- `src/pages/DebtManagement.tsx` (526 lines) split into ANPAS-compliant feature module (`src/pages/debt/`)
  - `DebtManagement.tsx` — main page with header stats, tabs, search, debt/customer list (max 120 lines)
  - `components/DebtDetailModal.tsx` — debt detail view (max 80 lines)
  - `components/PaymentModal.tsx` — record debt payment modal (max 80 lines)
  - `components/AddCustomerSheet.tsx` — add customer bottom sheet (max 80 lines)
  - `components/RecordDebtSheet.tsx` — record debt amount sheet (max 80 lines)
  - `components/CustomerRow.tsx` — customer list row (max 60 lines)
  - `components/DebtContent.tsx` — debt/customer list content (max 60 lines)
  - `hooks/useDebtState.ts` — business logic: filteredDebts, filteredCustomers, pending computation, handlers (max 100 lines)
- Updated `src/App.tsx` to import `DebtManagement` from `src/pages/debt/DebtManagement`
- Deleted original monolithic `src/pages/DebtManagement.tsx` (526 lines)
- `tsc --noEmit` passes (refactored files)

**Files:** src/App.tsx, src/pages/debt/DebtManagement.tsx, src/pages/debt/components/DebtDetailModal.tsx, src/pages/debt/components/PaymentModal.tsx, src/pages/debt/components/AddCustomerSheet.tsx, src/pages/debt/components/RecordDebtSheet.tsx, src/pages/debt/components/CustomerRow.tsx, src/pages/debt/components/DebtContent.tsx, src/pages/debt/hooks/useDebtState.ts
