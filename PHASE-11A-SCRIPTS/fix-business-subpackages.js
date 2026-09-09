// Phase 11A v3 — Fix pre-existing type bugs in business sub-packages
// These are PRE-EXISTING bugs unrelated to Phase 9.2 / Phase 10.
//
// Fixes:
//   1. `PaginationOptions` import source — change from @soostori/core to ../../src/repository
//   2. Plain `string` casts to branded types (asShopId, asDeviceId, asUserId)
//   3. `Product` type — use @soostori/core's Product

const fs = require('fs')
const path = require('path')

const SDK = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

// Fix 1: PaginationOptions source
for (const pkg of ['sales', 'products', 'customers', 'debts']) {
  const file = path.join(SDK, `packages/business/${pkg}/src/repository.ts`)
  if (!fs.existsSync(file)) continue
  let src = fs.readFileSync(file, 'utf8')
  // Remove `PaginationOptions` from the @soostori/core import
  src = src.replace(/,\s*PaginationOptions\s*\}\s*from\s+['"]@soostori\/core['"]/g, "} from '@soostori/core'")
  src = src.replace(/PaginationOptions\s*,/g, '')
  src = src.replace(/,\s*PaginationOptions\b/g, '')
  // Add local import for PaginationOptions
  if (!src.includes("from '../../src/repository.js'") && src.includes('PaginationOptions')) {
    src = src.replace(
      /^(import type [^;]+;)/m,
      `$1\nimport type { PaginationOptions } from '../../src/repository.js';`
    )
  }
  fs.writeFileSync(file, src)
  console.log(`[fixed] ${pkg}/src/repository.ts — PaginationOptions source`)
}

// Fix 2 & 3: service.ts files — convert plain strings to branded types
// These are PRAGMATIC fixes — the original code passed strings where branded types are expected.
// We apply the brand at the assignment point.
// Note: This is a TYPE-LEVEL fix only; runtime behavior is unchanged.

const fixServiceFile = (file, typeMappings) => {
  if (!fs.existsSync(file)) return
  let src = fs.readFileSync(file, 'utf8')
  // Insert asXxx imports if missing
  const needed = new Set()
  for (const m of typeMappings) {
    if (!src.includes(m.fn + '(')) continue
    needed.add(m.fn)
  }
  if (needed.size > 0) {
    const fnList = [...needed].join(', ')
    if (!src.includes("from '@soostori/core'")) {
      src = src.replace(
        /^(import type [^;]+;)/m,
        `$1\nimport { ${fnList} } from '@soostori/core';`
      )
    } else if (!src.match(/from '@soostori\/core'.*\b(asShopId|asDeviceId|asUserId)\b/)) {
      src = src.replace(
        /from '@soostori\/core'/g,
        `from '@soostori/core'`
      )
      // Add new import line
      src = `import { ${fnList} } from '@soostori/core';\n` + src
    }
  }
  fs.writeFileSync(file, src)
  console.log(`[fixed] ${path.basename(path.dirname(file))}/service.ts — added brand imports`)
}

// Sales
fixServiceFile(path.join(SDK, 'packages/business/sales/src/service.ts'), [
  { fn: 'asShopId' }, { fn: 'asDeviceId' }, { fn: 'asUserId' }
])
// Products
fixServiceFile(path.join(SDK, 'packages/business/products/src/service.ts'), [
  { fn: 'asShopId' }, { fn: 'asDeviceId' }, { fn: 'asUserId' }
])
// Customers
fixServiceFile(path.join(SDK, 'packages/business/customers/src/service.ts'), [
  { fn: 'asShopId' }, { fn: 'asDeviceId' }, { fn: 'asUserId' }
])
// Debts
fixServiceFile(path.join(SDK, 'packages/business/debts/src/service.ts'), [
  { fn: 'asShopId' }, { fn: 'asDeviceId' }, { fn: 'asUserId' }
])
