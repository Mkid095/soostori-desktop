# Architecture Documentation

This directory holds architectural decision records (ADRs) and high-level system architecture documentation.

## Contents

### ADRs (Architecture Decision Records)

See `docs/decisions/` for ADRs that capture significant architectural choices.

### System Architecture

**High-level architecture:**

```
Electron Main Process
  SQLite DB (better-sqlite3)     Hardware (Serial, ESC/POS)    App/Window (Dialog, IPC)
           │                              │                          │
           └──────────────────────────────┼──────────────────────────┘
                                         │ IPC (invoke/handle)
  ┌──────────────────────────────────────▼────────────────────────────────────┐
  │                    contextBridge (preload.ts)                             │
  │              electronAPI = { db, hw, app, updater }                       │
  └──────────────────────────────────────┬────────────────────────────────────┘
                                         │
  ┌──────────────────────────────────────▼────────────────────────────────────┐
  │                        React Renderer (src/)                             │
  │     Pages: POS, Inventory, Reports, Debt, Settings                         │
  │     Hooks: useDatabase, useScanner, usePrinter                           │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Local SQLite only** — no network, all data in `soostori.db`
2. **IPC bridge via contextBridge** — renderer is sandboxed, no direct Node access
3. **SQLite in main process** — database operations only from `electron/` layer
4. **ESC/POS for receipts** — raw serial bytes for thermal printer compatibility
5. **electron-store for hardware config** — fast startup, separate from SQLite data
6. **React Query for data fetching** — caching, background refetch in hooks

### Directory Structure

```
docs/
├── architecture/
│   └── README.md           # This file
├── decisions/
│   └── ADR-template.md     # Template for new ADRs
├── POS-README.md           # POS domain docs
├── Inventory-README.md      # Inventory domain docs
├── Reports-README.md        # Reports domain docs
├── Debt-README.md          # Debt management docs
└── Settings-README.md      # Settings/hardware docs
```
