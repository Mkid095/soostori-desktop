# Settings — Hardware & Shop Configuration

## Purpose

The Settings module manages two distinct areas: shop profile configuration (name, address, receipt text) and hardware setup (scanner type/port, printer port/baud).

## Architecture

```
Shop Settings ←→ Shop profile DB (shop_settings table)
Hardware Settings ←→ electron-store (persistent JSON file, not SQLite)
```

## Shop Settings

Shop profile stored in SQLite `shop_settings` table.

### Key Fields

```typescript
interface ShopSettings {
  id: string           // Always 'default' (single-shop)
  name: string         // Shop display name
  address?: string
  phone?: string
  email?: string
  currency: string     // Default: 'KES'
  receiptFooter?: string
  receiptPrefix?: string  // Default: 'INV'
  lowStockThreshold?: number
  mpesaSendMoneyPhone?: string
  mpesaPaybillNumber?: string
  mpesaPaybillAccount?: string
  bankPaybillNumber?: string
  bankPaybillAccount?: string
  mpesaPochiPhone?: string
}
```

### Receipt Configuration

Receipts are formatted by `electron/hardware/printer.ts` using shop settings:
- `shopName` from settings
- `shopAddress`, `shopPhone` included in receipt header
- `receiptPrefix` used as receipt number prefix
- `receiptFooter` printed at bottom of receipt

## Hardware Settings

Hardware configuration stored in `electron-store` (persistent JSON in userData folder).

```typescript
interface HardwareSettings {
  scanner: {
    type: 'keyboard' | 'serial'
    serialPort?: string
    baudRate: number    // Default: 9600
  }
  printer: {
    type: 'escpos' | 'system'
    serialPort?: string
    baudRate: number   // Default: 9600
  }
}
```

## Scanner Types

| Type | How it works | Configuration needed |
|------|-------------|---------------------|
| `keyboard` | Barcode arrives as keyboard input; captured by focused input or global listener | None |
| `serial` | Barcode received via COM port; emitted over IPC as `hw:scanner:barcode` event | Port + baud rate |

### Serial Scanner Flow

```
Settings → Select COM port + baud rate → Save
  → startSerialScanner(port, baudRate)
  → SerialPort reads lines → parses barcode
  → Sends via ipcRenderer('hw:scanner:barcode', barcode)
  → POS/hardware-handler receives and processes
```

## Printer Types

| Type | How it works | Configuration |
|------|-------------|---------------|
| `escpos` | ESC/POS commands sent over serial; raw byte formatting | Port + baud rate |
| `system` | HTML receipt opened in OS print dialog | None |

### ESC/POS Printer Flow

```
POS checkout → buildReceiptData()
  → window.electronAPI.hw.printReceipt(data)
  → ipcRenderer.invoke('hw:printer:print', receiptData)
  → hardware-handlers.ts → printer.ts
  → ESC/POS command builder formats: initialize, bold on, text lines, cut
  → Serial port write raw bytes
```

## Main Files

| File | Responsibility |
|------|---------------|
| `src/pages/Settings.tsx` | Settings page UI — shop form, scanner config, printer config |
| `src/lib/types.ts` | ShopSettings, HardwareSettings types |
| `src/hooks/useDatabase.ts` | Hook: useShopSettings, useUpdateShopSettings |
| `electron/database/index.ts` | SQLite schema for shop_settings |
| `electron/hardware/printer.ts` | ESC/POS command builder |
| `electron/ipc-handlers/hardware-handlers.ts` | Scanner/ printer IPC handlers |
| `electron/ipc-handlers/app-handlers.ts` | Shop settings IPC handlers |
| `electron/preload.ts` | contextBridge exposes hw.* and db.shop-settings.* |

## Hardware Detection

- `listSerialPorts()` — enumerates available COM ports (uses `serialport` package)
- `autoDetectScanner()` — attempts to find a scanner port automatically
- `testPrint()` — sends a test pattern to the configured printer port

## Notes

- Shop settings are persisted in SQLite and survive database resets
- Hardware settings are in electron-store (separate from SQLite) for fast startup
- Scanner type preference is stored in electron-store and read at app start
- Printer ESC/POS commands are model-agnostic within Epson TM-series compatibility
