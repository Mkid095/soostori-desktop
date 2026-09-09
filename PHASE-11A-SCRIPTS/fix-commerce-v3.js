/**
 * Phase 11A.1 — Fix pre-existing type bugs in commerce packages.
 *
 * Strategy:
 *   1. products owns canonical Product. Remove core's Product import attempt.
 *      ProductVariant lives in products/src/types.ts (local), no core dependency.
 *   2. customers/debts/sales keep their own types and use core's branded ID helpers.
 *   3. All `createEvent` callsites need branded IDs cast via asShopId/asDeviceId/asUserId.
 *   4. Add .js extensions to all relative imports.
 *   5. Remove `PaginationOptions` from core (it never existed there) — keep local.
 *   6. Fix rootDir: "./src" for all 4 packages (they use business/ relative path).
 */

const fs = require('fs')
const path = require('path')

const SDK = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

function patch(file, fn, label) {
  if (!fs.existsSync(file)) return false
  let src = fs.readFileSync(file, 'utf8')
  const out = fn(src)
  if (out !== src) {
    fs.writeFileSync(file, out)
    console.log(`[fixed] ${label || path.relative(SDK, file)}`)
    return true
  }
  return false
}

const PKG_BASE = SDK + '/packages/business'

// ===== Add .js extensions to relative imports in all 4 packages =====
function addJsExt(src) {
  // Pattern 1: from './foo' or '../foo'
  let out = src.replace(/(from\s+)(['"])(\.\.?\/[^'"]*?)\2/g, (m, p, q, path) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(path)) return m
    return `${p}${q}${path}.js${q}`
  })
  // Pattern 2: export * from './foo'
  out = out.replace(/(export\s*\*\s*from\s+)(['"])(\.\.?\/[^'"]*?)\2/g, (m, p, q, path) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(path)) return m
    return `${p}${q}${path}.js${q}`
  })
  // Pattern 3: dynamic imports
  out = out.replace(/(import\s*\(\s*['"])(\.\.?\/[^'"]*?)(['"])/g, (m, p, path, q) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(path)) return m
    return `${p}${path}.js${q}`
  })
  return out
}

// Apply to all source files in 4 packages
for (const pkg of ['products', 'customers', 'debts', 'sales']) {
  const srcDir = path.join(PKG_BASE, pkg, 'src')
  if (!fs.existsSync(srcDir)) continue
  for (const f of fs.readdirSync(srcDir)) {
    if (f.endsWith('.ts') && !f.endsWith('.d.ts')) {
      patch(path.join(srcDir, f), addJsExt, `${pkg}/src/${f}`)
    }
  }
}

// ===== Fix products/src/types.ts =====
// Remove ProductVariant from products/src/types since it lives here, no need to import it
// Actually — ProductVariant is defined LOCALLY in products/src/types.ts.
// The error was products/src/repository.ts trying to import ProductVariant from @soostori/core.
// Fix: in repository.ts, remove the core import of ProductVariant (it's defined in ./types.js)
// Keep core's Product import — but products also has its own local Product. Don't double-import.

const productsTypes = path.join(PKG_BASE, 'products/src/types.ts')
patch(productsTypes, src => src, 'products/src/types.ts (re-check)')

// ===== Fix products/src/repository.ts =====
// - Remove ProductVariant from core import (ProductVariant is local in types.ts)
// - Add .js ext (already done)
const productsRepo = path.join(PKG_BASE, 'products/src/repository.ts')
patch(productsRepo, src => {
  // Fix ProductVariant import — it's local in ./types.js, not from core
  return src.replace(
    /import type \{ Product, Category, ProductVariant, Money, ISO8601 \} from '@soostori\/core'/g,
    "import type { Product, Category, Money, ISO8601 } from '@soostori/core'"
  ).replace(
    /import type \{ ProductVariant, Product, Category, Money, ISO8601 \} from '@soostori\/core'/g,
    "import type { Product, Category, Money, ISO8601 } from '@soostori/core'"
  ).replace(
    /ProductVariant(?!\w)/g, '' // remove bare ProductVariant references
  )
}, 'products/src/repository.ts — remove core ProductVariant import')

// ===== Fix products/src/service.ts =====
// Add branded ID cast imports + wrap createEvent callsites
patch(path.join(PKG_BASE, 'products/src/service.ts'), src => {
  // Add brand cast imports
  if (!src.includes('asShopId')) {
    // Find the @soostori/core import line
    src = src.replace(
      /import type \{ UUID, Money \} from '@soostori\/core'/,
      "import type { UUID, Money } from '@soostori/core'\nimport { asShopId, asDeviceId, asUserId } from '@soostori/core'"
    )
  }
  // Wrap createEvent callsites
  src = src.replace(/shopId: this\.shopId,/g, 'shopId: asShopId(this.shopId),')
  src = src.replace(/deviceId: this\.deviceId,/g, 'deviceId: asDeviceId(this.deviceId),')
  src = src.replace(/userId: this\.userId,/g, 'userId: this.userId ? asUserId(this.userId) : undefined,')
  return src
}, 'products/src/service.ts — brand casts')

// ===== Fix sales/src/service.ts =====
// Same brand cast pattern, plus import from @soostori/products
patch(path.join(PKG_BASE, 'sales/src/service.ts'), src => {
  if (!src.includes('asShopId')) {
    src = src.replace(
      /import type \{ UUID, Money \} from '@soostori\/core'/,
      "import type { UUID, Money } from '@soostori/core'\nimport { asShopId, asDeviceId, asUserId } from '@soostori/core'"
    )
  }
  src = src.replace(/shopId: this\.shopId,/g, 'shopId: asShopId(this.shopId),')
  src = src.replace(/deviceId: this\.primaryDeviceId,/g, 'deviceId: asDeviceId(this.primaryDeviceId),')
  src = src.replace(/userId: this\.userId,/g, 'userId: this.userId ? asUserId(this.userId) : undefined,')
  src = src.replace(/userId: args\.userId,/g, 'userId: args.userId ? asUserId(args.userId) : undefined,')
  return src
}, 'sales/src/service.ts — brand casts')

// ===== Fix customers/src/service.ts =====
patch(path.join(PKG_BASE, 'customers/src/service.ts'), src => {
  if (!src.includes('asShopId')) {
    src = src.replace(
      /import type \{ UUID \} from '@soostori\/core'/,
      "import type { UUID } from '@soostori/core'\nimport { asShopId, asDeviceId, asUserId } from '@soostori/core'"
    )
  }
  src = src.replace(/shopId: this\.shopId,/g, 'shopId: asShopId(this.shopId),')
  src = src.replace(/deviceId: this\.deviceId,/g, 'deviceId: asDeviceId(this.deviceId),')
  src = src.replace(/userId: this\.userId,/g, 'userId: this.userId ? asUserId(this.userId) : undefined,')
  return src
}, 'customers/src/service.ts — brand casts')

// ===== Fix debts/src/service.ts =====
patch(path.join(PKG_BASE, 'debts/src/service.ts'), src => {
  if (!src.includes('asShopId')) {
    src = src.replace(
      /import type \{ UUID \} from '@soostori\/core'/,
      "import type { UUID } from '@soostori/core'\nimport { asShopId, asDeviceId, asUserId } from '@soostori/core'"
    )
  }
  src = src.replace(/shopId: this\.shopId,/g, 'shopId: asShopId(this.shopId),')
  src = src.replace(/deviceId: this\.deviceId,/g, 'deviceId: asDeviceId(this.deviceId),')
  src = src.replace(/userId: this\.userId,/g, 'userId: this.userId ? asUserId(this.userId) : undefined,')
  return src
}, 'debts/src/service.ts — brand casts')

// ===== Fix tsconfig.json for all 4 — remove rootDir, add include patterns =====
// The earlier blanket `rootDir: ./src` change is wrong for nested business sub-packages
// because their src/ subdir relative to business/ is unusual. Switch to a relaxed config.
for (const pkg of ['products', 'customers', 'debts', 'sales']) {
  const tsPath = path.join(PKG_BASE, pkg, 'tsconfig.json')
  patch(tsPath, src => {
    const cfg = JSON.parse(src)
    delete cfg.compilerOptions.rootDir
    cfg.compilerOptions.outDir = 'dist'
    cfg.include = ['src/**/*']
    return JSON.stringify(cfg, null, 2) + '\n'
  }, `${pkg}/tsconfig.json — remove rootDir`)
}

// ===== Fix customers/debts/repository.ts — PaginationOptions is local =====
for (const pkg of ['customers', 'debts']) {
  const repoFile = path.join(PKG_BASE, pkg, 'src/repository.ts')
  patch(repoFile, src => {
    return src.replace(
      /import type \{ UUID, PaginationOptions \} from '@soostori\/core'/g,
      "import type { UUID } from '@soostori/core'"
    ).replace(
      /import type \{ UUID, ISO8601, PaginationOptions \} from '@soostori\/core'/g,
      "import type { UUID, ISO8601 } from '@soostori/core'"
    )
  }, `${pkg}/src/repository.ts — PaginationOptions remove from core`)
}

// Add local PaginationOptions to customers/debts types.ts if not already there
for (const pkg of ['customers', 'debts']) {
  const typesFile = path.join(PKG_BASE, pkg, 'src/types.ts')
  patch(typesFile, src => {
    if (src.includes('PaginationOptions')) return src
    return src + '\n/** Pagination options for repository queries. */\nexport interface PaginationOptions {\n  limit?: number\n  offset?: number\n}\n'
  }, `${pkg}/src/types.ts — add PaginationOptions`)

  // Add PaginationOptions import to repository.ts
  const repoFile = path.join(PKG_BASE, pkg, 'src/repository.ts')
  patch(repoFile, src => {
    if (src.match(/import type \{ PaginationOptions \} from '\.\/types\.js'/)) return src
    if (src.match(/from '\.\/types\.js'/)) {
      return src.replace(
        /from '\.\/types\.js'/,
        "from './types.js'"
      ).replace(
        /^(import type \{ [^}]* \} from '\.\/types\.js')/m,
        "$1\nimport type { PaginationOptions } from './types.js'"
      )
    }
    return src
  }, `${pkg}/src/repository.ts — import PaginationOptions from local`)
}

console.log('\n=== Phase 11A.1 commerce fix complete ===')
