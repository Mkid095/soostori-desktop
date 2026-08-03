# Soostori Desktop

**Standalone Electron desktop app for POS and inventory management.**

> **STRICT RULE — READ BEFORE ANY WORK:** This project follows ANPAS (AI-Native Project Architecture Standard). All AI agents doing development work in this codebase MUST follow the rules in `.ai/coding-rules.md` and verify their work against `.ai/review-checklist.md` BEFORE declaring done. Non-compliance is not optional.

---

## Platform Architecture — Source of Truth

The complete Soostori platform architecture is documented in `docs/ARCHITECTURE.md`.

**Read this FIRST if you are new to the project.** It covers:
- All 5 products (Desktop, Mobile, Web, Updates, Backend)
- Technology stack (Convex/Supabase, Tuma M-Pesa, Cloudinary, Resend)
- User roles and access matrix
- Offline-first sync strategy
- Anti-piracy eligibility system
- Payment flows
- Directory structure for all products

**TL;DR of the platform:**
```
soostori/
├── soostori-web/          → Admin dashboards (Super Admin, Shop Owner, Salesperson)
├── soostori-mobile/       → React Native POS (offline-first)
├── soostori-desktop/      → THIS APP — Electron POS (offline-first)
├── soostori-updates/      → Self-hosted update server
└── soostori-backend/      → Go API on VPS (auth, M-Pesa, sync, Postgres)
```

**Build sequence (current phase):**
```
Phase 1: Desktop (soostori-desktop) ← WE ARE HERE
  └── Take existing Electron + SQLite app, add sync queue layer
Phase 2: Mobile (soostori-mobile)
  └── Scaffold Expo, copy Desktop patterns, same SQLite schema
Phase 3: Backend (soostori-backend)
  └── Extend fidscript_api (Go), Postgres schema, auth, M-Pesa
Phase 4: Connect Desktop + Mobile to Backend
Phase 5: Web Dashboard (Admin portals)
```

---

## ANPAS — AI-Native Project Architecture Standard

ANPAS is the coding standard for ALL Soostori software — Desktop, Mobile, Web, Backend, and Updates. Every line of code must comply.

> **ANPAS is non-negotiable. No exceptions.**

---

## Non-Negotiable Development Rules

These rules are enforced on every task. No exceptions without documented approval.

| Rule | Limit | Enforcement |
|------|-------|-------------|
| Max file size | **150 lines** | Count before committing |
| File naming | `[domain]-[action]-[type].ts` | No `helpers.ts`, `common.ts`, `utils.ts` |
| Business logic | **NEVER** in React components | Always in `src/lib/` or `electron/` services |
| UI components | **NEVER** contain API calls, validation, or business logic | Only rendering + event emission |
| Generic utilities | **FORBIDDEN** | helpers.ts, common.ts, misc.ts, tools.ts do not exist |
| TypeScript | Strict — no `any`, no implicit `any` | tsc --noEmit must pass |
| Commit | **Always update CHANGELOG.md** | Every commit, every change |

---

## AI Agent Entry Order

Before touching any code, read in this exact order:

1. **`.ai/coding-rules.md`** — enforcement rules (non-negotiable)
2. **`.ai/project-manifest.md`** — system overview, domains, flows
3. **`.ai/review-checklist.md`** — must complete every item before declaring done
4. **`.ai/workflows.md`** — execution flow
5. This file (`CLAUDE.md`)
6. Then inspect the relevant files

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
│       ├── hardware-handlers.ts  # Scanner + printer IPC handlers
│       └── app-handlers.ts       # Window + dialog IPC handlers
├── src/                        # React renderer process
│   ├── App.tsx                 # Main layout + sidebar navigation
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind styles
│   ├── pages/
│   │   ├── POS.tsx             # Point of Sale page
│   │   ├── Inventory.tsx       # Inventory management page
│   │   └── Settings.tsx        # Hardware + shop settings
│   ├── hooks/
│   │   ├── useDatabase.ts      # React Query hooks wrapping IPC calls
│   │   ├── useScanner.ts        # Serial scanner hook
│   │   └── usePrinter.ts       # Receipt printer hook
│   └── lib/
│       ├── types.ts            # TypeScript type definitions
│       ├── api.ts              # IPC API bridge
│       └── utils.ts            # Utility functions
├── .ai/                        # AI OPERATING LAYER (ANPAS)
│   ├── project-manifest.md    # System overview
│   ├── prompt-template.md      # Task communication format
│   ├── workflows.md            # Execution flow
│   ├── coding-rules.md         # ENFORCEMENT RULES — READ FIRST
│   └── review-checklist.md     # VERIFICATION CHECKLIST — COMPLETE BEFORE DONE
├── docs/                       # Architecture decisions
├── AGENTS.md                   # AI agent rules summary
├── CLAUDE.md                   # This file
├── README.md                   # Human quick-start
└── CHANGELOG.md                # Change log — UPDATE ON EVERY COMMIT
```

---

## Key Decisions

- **Local SQLite** — All data stored locally in `soostori.db` via better-sqlite3. No network required.
- **IPC Bridge** — Renderer (sandboxed) talks to main process via `contextBridge`. SQLite is only accessible from main process.
- **ESC/POS** — Thermal printers use ESC/POS commands sent over serial. System print uses OS print dialog.
- **Keyboard wedge scanner** — Works automatically. Serial scanner requires USB connection configured in Settings.

---

## Running

```bash
pnpm install
pnpm dev         # Development mode
pnpm build       # Build for production
pnpm package     # Package as Windows installer
```

---

## Database Schema

Mirrors soostori's Prisma schema for easy future sync:
- `products` — name, barcode, SKU, prices, stock
- `categories` — product categories
- `sales` / `sale_items` — completed transactions
- `held_sales` — saved carts for later
- `stock_movements` — stock change audit trail
- `shop_settings` — shop info + receipt config

---

## Hardware

- **Keyboard wedge scanners** — work out of the box, no config needed
- **Serial scanners** — configure port + baud rate in Settings
- **ESC/POS printers** — connect via USB/Serial, supports Epson TM series compatible printers
- **System print** — any printer via OS dialog, works for labels/receipts

---

## Future (not in scope for Phase 1)

- Server sync with soostori PostgreSQL backend
- Multi-shop support
- User authentication
- M-Pesa integration
- Client/debt management

---

## Verification Checklist (Run Before Every Commit)

- [ ] No file exceeds 150 lines (count with `wc -l`)
- [ ] No `helpers.ts`, `common.ts`, `misc.ts`, `utils.ts`, `tools.ts` files exist
- [ ] No business logic in `src/pages/*.tsx` — only UI rendering
- [ ] All IPC handlers in `electron/ipc-handlers/` — main process only
- [ ] CHANGELOG.md updated with this change
- [ ] `tsc --noEmit` passes
- [ ] No `any` types introduced
- [ ] Feature README created/updated if structure changed
