// Phase 11A v3 — Apply minimal brand-type fixes to business sub-packages
// These are TYPE-LEVEL fixes only — runtime behavior unchanged.

const fs = require('fs')
const path = require('path')

const SDK = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

function patchFile(file, patches) {
  if (!fs.existsSync(file)) return false
  let src = fs.readFileSync(file, 'utf8')
  let changed = false
  for (const p of patches) {
    if (p.test && src.match(p.test)) {
      src = src.replace(p.test, p.replace)
      changed = true
    } else if (!p.test) {
      // Apply replace unconditionally if `apply` is provided
      const before = src
      src = src.replace(p.find, p.replace)
      if (src !== before) changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(file, src)
    console.log(`[fixed] ${path.basename(path.dirname(file))}/${path.basename(file)}`)
  }
  return changed
}

// === Fix PaginationOptions import in each sub-package's repository.ts ===
for (const pkg of ['sales', 'products', 'customers', 'debts']) {
  const file = path.join(SDK, `packages/business/${pkg}/src/repository.ts`)
  patchFile(file, [
    {
      find: /import type \{ UUID, Money, ISO8601, PaginationOptions \} from '@soostori\/core'/,
      replace: "import type { UUID, Money, ISO8601 } from '@soostori/core'\nimport type { PaginationOptions } from '../../src/repository.js'"
    },
    {
      find: /import type \{ UUID, PaginationOptions \} from '@soostori\/core'/,
      replace: "import type { UUID } from '@soostori/core'\nimport type { PaginationOptions } from '../../src/repository.js'"
    },
    {
      find: /import type \{ PaginationOptions \} from '@soostori\/core'/,
      replace: "import type { PaginationOptions } from '../../src/repository.js'"
    }
  ])
}

// === Fix sales/src/service.ts: add asXxx imports and wrap call sites ===
patchFile(path.join(SDK, 'packages/business/sales/src/service.ts'), [
  // Add brand cast imports if not present
  {
    find: /^import \{ newId, UUID \} from '@soostori\/core'/m,
    replace: "import { newId, asShopId, asDeviceId, asUserId, type UUID } from '@soostori/core'"
  },
  // Wrap shopId in asShopId calls
  { find: /shopId: this\.shopId,/g, replace: 'shopId: asShopId(this.shopId),' },
  { find: /deviceId: this\.primaryDeviceId,/g, replace: 'deviceId: asDeviceId(this.primaryDeviceId),' },
  { find: /userId: this\.userId,/g, replace: 'userId: asUserId(this.userId),' },
  { find: /userId: args\.userId,/g, replace: 'userId: asUserId(args.userId),' }
])

// === Fix products/src/service.ts (use @soostori/core Product + branded casts) ===
patchFile(path.join(SDK, 'packages/business/products/src/service.ts'), [
  // Replace local Product with @soostori/core's
  {
    find: /import type \{ Product, ProductVariant, Category, PaginationOptions \} from '@soostori\/core'/,
    replace: "import { asShopId, asDeviceId, asUserId, type Product, type Category } from '@soostori/core'\nimport type { PaginationOptions } from '../../src/repository.js'"
  },
  { find: /shopId: this\.shopId,/g, replace: 'shopId: asShopId(this.shopId),' },
  { find: /deviceId: this\.deviceId,/g, replace: 'deviceId: asDeviceId(this.deviceId),' },
  { find: /userId: this\.userId,/g, replace: 'userId: asUserId(this.userId),' }
])

// === Fix customers/src/service.ts ===
patchFile(path.join(SDK, 'packages/business/customers/src/service.ts'), [
  {
    find: /import type \{ UUID, ISO8601, PaginationOptions \} from '@soostori\/core'/,
    replace: "import { asShopId, asDeviceId, asUserId, type UUID } from '@soostori/core'\nimport type { PaginationOptions } from '../../src/repository.js'"
  },
  { find: /shopId: this\.shopId,/g, replace: 'shopId: asShopId(this.shopId),' },
  { find: /deviceId: this\.deviceId,/g, replace: 'deviceId: asDeviceId(this.deviceId),' },
  { find: /userId: this\.userId,/g, replace: 'userId: asUserId(this.userId),' }
])

// === Fix debts/src/service.ts ===
patchFile(path.join(SDK, 'packages/business/debts/src/service.ts'), [
  {
    find: /import type \{ UUID, PaginationOptions \} from '@soostori\/core'/,
    replace: "import { asShopId, asDeviceId, asUserId, type UUID } from '@soostori/core'\nimport type { PaginationOptions } from '../../src/repository.js'"
  },
  { find: /shopId: this\.shopId,/g, replace: 'shopId: asShopId(this.shopId),' },
  { find: /deviceId: this\.deviceId,/g, replace: 'deviceId: asDeviceId(this.deviceId),' },
  { find: /userId: this\.userId,/g, replace: 'userId: asUserId(this.userId),' }
])

console.log('\nFixes complete')
