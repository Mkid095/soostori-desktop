/**
 * Phase 11A — Add .js extensions to relative imports in TypeScript source files
 * for NodeNext module resolution compatibility.
 *
 * Skips:
 *  - node_modules
 *  - dist directories
 *  - type-only imports (just `import type` lines)
 *  - non-relative imports (e.g. `import x from 'zod'`)
 *
 * Only modifies relative imports that lack an explicit extension.
 */

const fs = require('fs')
const path = require('path')

const SDK_ROOT = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

// Regex matches: import ... from './foo' or '../bar' or '@/...'
// Captures the relative path only
const RELATIVE_IMPORT_RE = /((?:import|export)\s+(?:[^'";]*?from\s+)?)(['"])(?:\.{1,2}\/[^'"]*?)\2/g

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue
      walk(full, out)
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

let modifiedFiles = 0
let modifiedLines = 0

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  let fileChanged = false
  let lineMods = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip type-only imports
    if (/^\s*import\s+type\b/.test(line)) continue
    // Skip lines without a relative import
    if (!/from\s+['"](?:\.{1,2}\/)[^'"]*['"]/.test(line)) continue

    // Modify all relative imports in the line
    const newLine = line.replace(/from\s+(['"])(\.\.?\/[^'"]*?)\1/g, (m, q, p) => {
      // If already has .js or .ts or .json extension, leave alone
      if (/\.(js|ts|json|mjs|cjs)$/.test(p)) return m
      // Otherwise add .js
      lineMods++
      return `from ${q}${p}.js${q}`
    })

    // Also handle `export * from './foo'` and `import './foo'`
    const newLine2 = newLine.replace(/(export\s*\*\s*from\s+|import\s+)(['"])(\.\.?\/[^'"]*?)\2/g, (m, prefix, q, p) => {
      if (/\.(js|ts|json|mjs|cjs)$/.test(p)) return m
      lineMods++
      return `${prefix}${q}${p}.js${q}`
    })

    if (newLine2 !== line) {
      lines[i] = newLine2
      fileChanged = true
    }
  }

  if (fileChanged) {
    fs.writeFileSync(file, lines.join('\n'))
    modifiedFiles++
    modifiedLines += lineMods
    console.log(`[modified] ${path.relative(SDK_ROOT, file)} (${lineMods} imports)`)
  }
}

// Process all .ts files under packages/
const dirs = [
  path.join(SDK_ROOT, 'packages', 'core', 'src'),
  path.join(SDK_ROOT, 'packages', 'events', 'src'),
  path.join(SDK_ROOT, 'packages', 'schema', 'src'),
  path.join(SDK_ROOT, 'packages', 'auth', 'src'),
  path.join(SDK_ROOT, 'packages', 'devices', 'src'),
  path.join(SDK_ROOT, 'packages', 'inventory', 'src'),
  path.join(SDK_ROOT, 'packages', 'lan', 'src'),
  path.join(SDK_ROOT, 'packages', 'sync', 'src'),
  path.join(SDK_ROOT, 'packages', 'business', 'src'),
  path.join(SDK_ROOT, 'packages', 'business', 'sales', 'src'),
  path.join(SDK_ROOT, 'packages', 'business', 'products', 'src'),
  path.join(SDK_ROOT, 'packages', 'business', 'customers', 'src'),
  path.join(SDK_ROOT, 'packages', 'business', 'debts', 'src'),
  path.join(SDK_ROOT, 'packages', 'cloud', 'src'),
  path.join(SDK_ROOT, 'packages', 'storage', 'src'),
  path.join(SDK_ROOT, 'packages', 'offline', 'src'),
  path.join(SDK_ROOT, 'packages', 'audit', 'src'),
  path.join(SDK_ROOT, 'packages', 'notifications', 'src'),
  path.join(SDK_ROOT, 'packages', 'payments', 'src'),
  path.join(SDK_ROOT, 'packages', 'tuma', 'src'),
  path.join(SDK_ROOT, 'packages', 'whatsapp', 'src'),
  path.join(SDK_ROOT, 'packages', 'subscription', 'src'),
  path.join(SDK_ROOT, 'packages', 'desktop-adapter', 'src'),
]

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue
  const files = []
  walk(dir, files)
  for (const f of files) processFile(f)
}

console.log(`\nModified ${modifiedFiles} files, ${modifiedLines} imports`)
