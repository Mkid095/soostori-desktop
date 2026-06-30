# Soostori Desktop

Standalone Electron desktop app for POS and inventory management.

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
│   │   ├── useScanner.ts       # Serial scanner hook
│   │   └── usePrinter.ts       # Receipt printer hook
│   └── lib/
│       ├── types.ts            # TypeScript type definitions
│       ├── api.ts              # IPC API bridge
│       └── utils.ts            # Utility functions
├── package.json
├── vite.config.ts
├── electron-builder.yml        # Packaging config
└── tsconfig.json
```

## Key Decisions

- **Local SQLite** — All data stored locally in `soostori.db` via better-sqlite3. No network required.
- **IPC Bridge** — Renderer (sandboxed) talks to main process via `contextBridge`. SQLite is only accessible from main process.
- **ESC/POS** — Thermal printers use ESC/POS commands sent over serial. System print uses OS print dialog.
- **Keyboard wedge scanner** — Works automatically. Serial scanner requires USB connection configured in Settings.

## Running

```bash
pnpm install
pnpm dev         # Development mode
pnpm build       # Build for production
pnpm package     # Package as Windows installer
```

## Database Schema

Mirrors soostori's Prisma schema for easy future sync:
- `products` — name, barcode, SKU, prices, stock
- `categories` — product categories
- `sales` / `sale_items` — completed transactions
- `held_sales` — saved carts for later
- `stock_movements` — stock change audit trail
- `shop_settings` — shop info + receipt config

## Hardware

- **Keyboard wedge scanners** — work out of the box, no config needed
- **Serial scanners** — configure port + baud rate in Settings
- **ESC/POS printers** — connect via USB/Serial, supports Epson TM series compatible printers
- **System print** — any printer via OS dialog, works for labels/receipts

## Future (not in scope for Phase 1)

- Server sync with soostori PostgreSQL backend
- Multi-shop support
- User authentication
- M-Pesa integration
- Client/debt management
