# Soostori Desktop

Standalone Electron desktop POS and inventory management app for Kenyan shops — no network required, local SQLite database.

## Overview

Soostori Desktop is a full-featured point-of-sale system running entirely offline. It manages products, sales, customer debts, and hardware (printers, scanners) from a local SQLite database.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Point of Sale** | Barcode scanning, cart management, multi-payment methods, held sales, receipt printing |
| **Inventory** | Product catalog, stock tracking, category management, stock movement audit trail, barcode generation |
| **Debt Management** | Track customer debts from credit sales, record partial payments, debt summary dashboard |
| **Sales Reports** | Daily/weekly/monthly sales, revenue by period, top products, payment method breakdown |
| **Hardware Support** | ESC/POS thermal printers (Epson TM series), keyboard wedge scanners (auto), serial scanners (configurable) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | Electron 33.x |
| Frontend | React 19 + Vite 6.x |
| Database | better-sqlite3 11.x (SQLite, local file) |
| Build/Package | electron-builder 25.x |
| Styling | Tailwind CSS 3.x |
| Language | TypeScript 5.x |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (hot reload)
pnpm dev

# Build production bundle
pnpm build

# Package as Windows installer (.exe)
pnpm package
```

---

## Database

All data is stored locally in a single SQLite file:

```
%APPDATA%/soostori-desktop/soostori.db
```

Schema includes: products, categories, sales, sale_items, held_sales, stock_movements, customers, debts, debt_payments, shop_settings, offer_combos.

---

## Hardware Setup

### Scanners

**Keyboard wedge scanners** — work out of the box, no configuration needed. They send keystrokes that the POS captures automatically.

**Serial scanners** — configure the COM port and baud rate in Settings > Hardware before use.

### Printers

**ESC/POS printers** (Epson TM series compatible) — connect via USB/Serial. Configure port and baud rate in Settings > Hardware, then test print.

**System print** — any printer via OS print dialog. Works for labels and generic receipts.

---

## Project Structure

```
soostori-desktop/
├── electron/                    # Electron main process
│   ├── main.ts                 # App entry, window creation, IPC registration
│   ├── preload.ts              # Secure contextBridge API exposure
│   ├── database/
│   │   └── index.ts            # SQLite schema + better-sqlite3 initialization
│   ├── hardware/
│   │   └── printer.ts          # ESC/POS command builder
│   └── ipc-handlers/
│       ├── database-handlers.ts # All SQLite CRUD IPC handlers
│       ├── hardware-handlers.ts # Scanner + printer IPC handlers
│       └── app-handlers.ts      # Window + dialog IPC handlers
├── src/                        # React renderer process
│   ├── App.tsx                 # Main layout + sidebar navigation
│   ├── main.tsx                # React entry point
│   ├── pages/
│   │   ├── POS.tsx             # Point of Sale page
│   │   ├── Inventory.tsx       # Inventory management page
│   │   ├── SalesReports.tsx    # Sales reports page
│   │   ├── DebtManagement.tsx  # Debt management page
│   │   └── Settings.tsx        # Hardware + shop settings
│   ├── hooks/
│   │   ├── useDatabase.ts      # React Query hooks wrapping IPC calls
│   │   ├── useScanner.ts       # Serial scanner hook
│   │   └── usePrinter.ts       # Receipt printer hook
│   └── lib/
│       ├── types.ts            # TypeScript type definitions
│       ├── api.ts              # IPC API bridge
│       └── utils.ts            # Utility functions
├── docs/                       # Feature documentation
├── .ai/                        # AI agent rules and workflows
├── CLAUDE.md                   # Project identity (AI entry point)
├── AGENTS.md                   # AI agent rules summary
└── CHANGELOG.md                # Change log
```

---

## IPC Architecture

Renderer (sandboxed React) communicates with main process via `contextBridge`:

```
Renderer                    Main Process
   │                            │
   │  window.electronAPI.db.*   │
   │ ─────────────────────────► │  SQLite (better-sqlite3)
   │                            │       │
   │  window.electronAPI.hw.*  │
   │ ─────────────────────────► │  Hardware (Serial, ESC/POS)
   │                            │
   │  window.electronAPI.app.* │
   │ ─────────────────────────► │  App (Window, Dialog)
```

---

## Key Files

| Purpose | File |
|---------|------|
| Main process entry | `electron/main.ts` |
| SQLite schema + initialization | `electron/database/index.ts` |
| IPC bridge (renderer API) | `electron/preload.ts` |
| Database handlers (all CRUD) | `electron/ipc-handlers/database-handlers.ts` |
| ESC/POS command builder | `electron/hardware/printer.ts` |
| POS page (UI shell) | `src/pages/POS.tsx` |
| TypeScript types | `src/lib/types.ts` |
| React Query hooks | `src/hooks/useDatabase.ts` |
