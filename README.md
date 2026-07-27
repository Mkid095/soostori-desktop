# Soostori Desktop

Standalone Electron desktop app for POS and inventory management — no network required.

## Quick Start

```bash
pnpm install
pnpm dev         # Development mode
pnpm build       # Build for production
pnpm package     # Package as Windows installer
```

## Project Structure

```
soostori-desktop/
├── electron/          # Electron main process (SQLite, ESC/POS, IPC)
│   ├── main.ts        # App entry, window creation, IPC registration
│   ├── preload.ts     # Secure contextBridge API exposure
│   ├── database/      # SQLite schema + better-sqlite3
│   └── hardware/      # ESC/POS printers, scanners
├── src/               # React renderer process
│   ├── pages/         # POS, Inventory, Settings
│   ├── hooks/         # useDatabase, useScanner, usePrinter
│   └── lib/           # Types, API bridge, utils
├── .ai/               # AI operating layer (ANPAS)
├── docs/              # Architecture decisions
├── CLAUDE.md          # Project identity (AI entry point)
├── AGENTS.md          # AI agent rules
└── CHANGELOG.md       # Change log
```

## Architecture

- **Local SQLite** — all data stored locally, no network
- **IPC Bridge** — renderer (sandboxed) talks to main process via contextBridge
- **ESC/POS** — thermal printers via serial commands

## Key Files

| What | File |
|------|------|
| Main process | `electron/main.ts` |
| SQLite schema | `electron/database/index.ts` |
| POS page | `src/pages/POS.tsx` |
| Inventory page | `src/pages/Inventory.tsx` |
| ESC/POS printer | `electron/hardware/printer.ts` |
