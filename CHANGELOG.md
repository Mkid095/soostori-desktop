# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Bidirectional sync — client sends mutations to host**: `db:sales:create` now routes to host via `syncService.sendSalePending()` when in client mode (returns optimistically with `status: 'pending'`); host mode writes directly to `sales`, `sync_sales`, `inventory_transactions`, and `stock_movements` atomically. `sync-service-messages.ts` extracted for `sendSalePending` and `sendLocalMutation`. `db:sales:create` fixed to use `COALESCE(current_stock, stock_quantity)` for stock deduction and keep both columns in sync. Added `sync_sales` table to `schema-sync.ts` (was referenced but not created).

- **Cloud sync wired to InstantDB** (`electron/services/instant-api.ts`): Low-level HTTP client for Instaml tx + InstaQL query against `apiinstant.fidscript.com`. `electron/services/cloud-sync.ts`: `pushSyncEvents()`, `pushShopSettings()`, `pullShopSettings()`, `pushDeviceHeartbeat()`, `checkCloudSubscription()`, `pushFullSnapshot()`. `electron/ipc-handlers/cloud-handlers.ts`: 7 IPC endpoints (`cloud:syncEvents`, `cloud:syncShopSettings`, `cloud:pullShopSettings`, `cloud:heartbeat`, `cloud:subscription`, `cloud:fullSync`, `cloud:health`, `cloud:reconnect`). All dispatch sync status events so `SyncIndicator` in TitleBar updates in real time. `electron/services/sync-task-service.ts`: background cycle every 2 min — pushes events, pulls settings, heartbeat. `src/hooks/useCloudSync.ts`: renderer hook with health/subscription/sync state. `.env` sets `INSTANT_APP_ID=0808ca7d-b0ba-4541-8906-48f7d0403950`.

- **Secure pairing flow improvements** (`device-handlers.ts`): `db:devices:requestPairing` now deduplicates — returns existing pending token if requested within 1 hour (avoids spamming pending rows). `db:devices:approvePairing` now issues a fresh `connection_token` (UUID) on approval, updates `devices.connection_token`, returns token to caller. Added `db:devices:getConnectionToken` for clients to retrieve their approved token. Pairing state machine: pending → approved (with token) | rejected.

- **Multi-terminal LAN sync + team accounts**: Full multi-device POS infrastructure. Database: `shops`, `employees` (PBKDF2 PIN hashing, 100k iterations), `invitations` (6-digit codes, 24h expiry), `devices` (connection_token for WS auth), `device_pairings`, `device_sessions`, `audit_logs`, `inventory_transactions` (event-sourced stock ledger, updates `products.current_stock` atomically), `sync_events` (sequence-numbered event log), `sync_sales`, `sync_sale_items`, `sync_queue`, `inventory_snapshots`, `sync_conflicts` (offline sale rejection queue), `sync_processed` (idempotency deduplication). IPC handlers: `shop-handlers`, `auth-handlers` (login with salt+hash verify), `invite-handlers`, `device-handlers` (pairing approval, token generation), `inventory-tx-handlers`, `audit-handlers`, `sync-sale-handlers`, `sync-queue-handlers`, `sync-conflict-handlers`. WebSocket sync: `electron/sync/server.ts` (host, port 18792, token-validated connections), `electron/sync/client.ts` (auto-reconnect backoff, token on connect), `electron/sync/sync-service.ts` (orchestrator), `sync/server-handlers.ts` (SALE_PENDING validation), `sync/server-handlers-core.ts` (shared utilities), `sync/server-queries.ts`. Sale state machine: `SALE_PENDING → host validates stock → SALE_CONFIRMED/SALE_REJECTED → broadcast → sync_conflicts entry on rejection`. Idempotency keys prevent duplicate event processing on reconnect. Role-based sidebar (cashier/manager/owner). Setup wizard for first-launch shop creation. Login screen with user list + PIN numpad. Team settings and device management (pairing approval). `src/shared/sync-protocol.ts` as single source of truth for event types. `electron/database/migrations.ts` with version tracking. Architecture audit documented in `docs/ARCHITECTURE-AUDIT.md`. Security: removed hardcoded `ADMIN_KEY`; PIN rate limiting; `Forgot PIN` redirects to shop owner. Note: production onboarding (cloud auth, subscription verification) is pending web/Instant DB schema agreement — local-only setup is dev mode only.

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
