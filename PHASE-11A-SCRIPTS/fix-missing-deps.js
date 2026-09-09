/**
 * Phase 11A — Fix missing @soostori/* dependency declarations.
 *
 * For each public package:
 *   1. Find all `@soostori/*` imports in src/
 *   2. Compare against declared dependencies
 *   3. Add any missing entries as `workspace:*`
 */

const fs = require('fs')
const path = require('path')

const SDK_ROOT = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'
const PKG_ROOT = path.join(SDK_ROOT, 'packages')

function findAllPackages(dir) {
  const out = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !['node_modules', 'dist', 'test', '.git'].includes(e.name)) {
      const pj = path.join(full, 'package.json')
      if (fs.existsSync(pj)) out.push(full)
      out.push(...findAllPackages(full))
    }
  }
  return out
}

const packages = findAllPackages(PKG_ROOT)
let totalAdded = 0

for (const dir of packages) {
  const pjPath = path.join(dir, 'package.json')
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'))

  if (pj.private === true) continue

  const pkgName = pj.name
  if (!pkgName || !pkgName.startsWith('@soostori/')) continue

  // Collect declared deps
  const declared = new Set([
    ...Object.keys(pj.dependencies || {}),
    ...Object.keys(pj.devDependencies || {}),
    ...Object.keys(pj.peerDependencies || {}),
    ...Object.keys(pj.optionalDependencies || {}),
  ])
  declared.add(pkgName) // self

  // Find imports in src/
  const srcDir = path.join(dir, 'src')
  if (!fs.existsSync(srcDir)) continue

  const imports = new Set()
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.ts$/.test(e.name) && !e.name.endsWith('.d.ts')) {
        const src = fs.readFileSync(full, 'utf8')
        // Match imports from @soostori/*
        const re = /from\s+['"](@soostori\/[^'"]+)['"]/g
        let m
        while ((m = re.exec(src)) !== null) {
          imports.add(m[1])
        }
        // Match dynamic imports
        const re2 = /import\s*\(\s*['"](@soostori\/[^'"]+)['"]/g
        while ((m = re2.exec(src)) !== null) {
          imports.add(m[1])
        }
      }
    }
  }
  walk(srcDir)

  // Find missing
  const missing = [...imports].filter(i => !declared.has(i))
  if (missing.length > 0) {
    pj.dependencies = pj.dependencies || {}
    for (const m of missing) {
      // Use exact version (not workspace:*) so packed tarballs have correct deps.
      // pnpm rewrites workspace:* at publish time.
      pj.dependencies[m] = 'workspace:*'
      totalAdded++
      console.log(`[added] ${pkgName}: ${m}`)
    }
    fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n')
  }
}

console.log(`\nAdded ${totalAdded} missing dependency declarations`)
