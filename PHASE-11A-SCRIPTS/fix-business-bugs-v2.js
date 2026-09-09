// Phase 11A v3 — Comprehensive fix for business sub-packages
// Step 1: PaginationOptions — define locally in each sub-package's types.ts (avoid parent import)
// Step 2: asXxx imports + casts
// Step 3: Product type fix

const fs = require('fs')
const path = require('path')

const SDK = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

function patch(file, fn) {
  if (!fs.existsSync(file)) return false
  const src = fs.readFileSync(file, 'utf8')
  const out = fn(src)
  if (out !== src) {
    fs.writeFileSync(file, out)
    console.log(`[fixed] ${path.relative(SDK, file)}`)
    return true
  }
  return false
}

// === Step 1: replace PaginationOptions imports ===
for (const pkg of ['sales', 'products', 'customers', 'debts']) {
  const repoFile = path.join(SDK, `packages/business/${pkg}/src/repository.ts`)
  patch(repoFile, src => {
    return src.replace(/import type \{ UUID, Money, ISO8601, PaginationOptions \} from '@soostori\/core'/g,
      "import type { UUID, Money, ISO8601 } from '@soostori/core'")
      .replace(/import type \{ UUID, PaginationOptions \} from '@soostori\/core'/g,
        "import type { UUID } from '@soostori/core'")
      .replace(/import type \{ PaginationOptions \} from '@soostori\/core'/g,
        "import type {} from '@soostori/core'")
      .replace(/,\s*PaginationOptions/g, '')
      .replace(/PaginationOptions,/g, '')
  })
}

// === Step 2: Add PaginationOptions to each sub-package's types.ts ===
for (const pkg of ['sales', 'products', 'customers', 'debts']) {
  const typesFile = path.join(SDK, `packages/business/${pkg}/src/types.ts`)
  if (!fs.existsSync(typesFile)) continue
  patch(typesFile, src => {
    if (src.includes('export interface PaginationOptions')) return src
    return src + '\n\n/** Pagination options — defined locally per package. */\nexport interface PaginationOptions {\n  limit?: number\n  offset?: number\n}\n'
  })
}

// === Step 3: Add PaginationOptions import from local types to each sub-package's repository.ts ===
for (const pkg of ['sales', 'products', 'customers', 'debts']) {
  const repoFile = path.join(SDK, `packages/business/${pkg}/src/repository.ts`)
  patch(repoFile, src => {
    if (src.includes('PaginationOptions') && !src.match(/import type \{[^}]*PaginationOptions[^}]*\}/)) {
      // Add the import
      if (src.match(/^import type \{[^}]*\} from '\.\/types\.js'/m)) {
        return src.replace(/^(import type \{[^}]*\} from '\.\/types\.js')/m, '$1\nimport type { PaginationOptions } from \'./types.js\'')
      }
    }
    return src
  })
}

// === Step 4: Add brand cast imports and wrap call sites in service.ts files ===
function fixService(file, brandNames) {
  patch(file, src => {
    // Find any import from '@soostori/core'
    const m = src.match(/^import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@soostori\/core['"]/m)
    if (m) {
      const existing = m[2].trim()
      const needed = brandNames.filter(b => !existing.includes(b))
      if (needed.length > 0) {
        const replacement = `${m[1] ? 'import type' : 'import'} { ${existing}, ${needed.join(', ')} } from '@soostori/core'`
        src = src.replace(m[0], replacement)
      }
    } else {
      // No existing import — add one
      const insertIdx = src.indexOf('\n')
      const needed = brandNames.join(', ')
      src = `import { ${needed} } from '@soostori/core';\n` + src
    }
    // Wrap call sites
    src = src.replace(/shopId: this\.shopId,/g, 'shopId: asShopId(this.shopId),')
    src = src.replace(/deviceId: this\.deviceId,/g, 'deviceId: asDeviceId(this.deviceId),')
    src = src.replace(/deviceId: this\.primaryDeviceId,/g, 'deviceId: asDeviceId(this.primaryDeviceId),')
    src = src.replace(/userId: this\.userId,/g, 'userId: asUserId(this.userId),')
    src = src.replace(/userId: args\.userId,/g, 'userId: asUserId(args.userId),')
    return src
  })
}

fixService(path.join(SDK, 'packages/business/sales/src/service.ts'), ['asShopId', 'asDeviceId', 'asUserId'])
fixService(path.join(SDK, 'packages/business/products/src/service.ts'), ['asShopId', 'asDeviceId', 'asUserId'])
fixService(path.join(SDK, 'packages/business/customers/src/service.ts'), ['asShopId', 'asDeviceId', 'asUserId'])
fixService(path.join(SDK, 'packages/business/debts/src/service.ts'), ['asShopId', 'asDeviceId', 'asUserId'])

// === Step 5: Fix products ProductVariant import ===
patch(path.join(SDK, 'packages/business/products/src/repository.ts'), src => {
  return src.replace(/ProductVariant(?!\w)/g, 'ProductVariantId')
    .replace(/,\s*ProductVariantId\s*,/g, ', ')
    .replace(/ProductVariantId\s*,/g, '')
})

console.log('\nDone')
