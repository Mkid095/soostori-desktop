# System Overview

**Purpose:** Standalone Electron desktop POS app for Kenyan shops — local SQLite, ESC/POS printers, barcode scanners, no network required.

**Version:** 1.0.0

**Last Updated:** 2026-07-27

---

## Core Domains

- **POS (Point of Sale):** Barcode scanning, cart management, cash/card payment, receipt printing
- **Inventory:** Product catalog, stock tracking, stock movements, category management
- **Hardware:** ESC/POS thermal printers, serial/keyboard-wedge scanners, USB serial config
- **Settings:** Shop profile, receipt configuration, scanner port setup

---

## Critical Flows

### POS Sale Flow
```
Barcode scan → Product lookup → Add to cart → Adjust qty → Checkout → Payment → Print receipt
```

### Inventory Update Flow
```
Scan barcode → Find product → Edit modal → Save → Stock movement logged
```

### Hardware Setup Flow
```
Settings → Scanner config (port/baud) OR Printer config → Test → Save
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Runtime | Electron | 33.x |
| Frontend | React 19 + Vite | 6.x |
| Database | better-sqlite3 (SQLite) | 11.x |
| Build/Package | electron-builder | 25.x |
| Styling | Tailwind CSS | 3.x |
| Language | TypeScript | 5.x |

---

## Restricted Areas

- **electron/database/index.ts:** SQLite schema — changes require schema migration script
- **electron/hardware/printer.ts:** ESC/POS command builder — protocol changes affect all printer models
- **electron/main.ts:** Main process lifecycle — IPC security model depends on this

---

## Entry Points

### For Humans
- Start here: `CLAUDE.md`
- Architecture: `docs/architecture/`
- Decisions: `docs/decisions/`

### For AI Agents
- First read: `CLAUDE.md` (root)
- Coding rules: `.ai/coding-rules.md`
- Review checklist: `.ai/review-checklist.md`
- Feature details: `features/[name]/README.md`

---

## Quick Navigation

| If you need to... | Go to... |
|-------------------|----------|
| Understand the project | `CLAUDE.md` |
| Add a POS feature | `src/pages/POS.tsx` |
| Add inventory feature | `src/pages/Inventory.tsx` |
| Modify hardware layer | `electron/hardware/` |
| Add database schema | `electron/database/index.ts` |
| See recent changes | `CHANGELOG.md` |
