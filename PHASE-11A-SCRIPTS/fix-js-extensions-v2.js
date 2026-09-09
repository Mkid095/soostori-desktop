/**
 * Phase 11A v2 — Add .js extensions to ALL relative imports/exports.
 * Includes type-only imports this time.
 */

const fs = require('fs')
const path = require('path')

const SDK_ROOT = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

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

let modified = 0

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8')
  let changed = false
  let newSrc = src

  // Pattern 1: from './relative' or from '../relative' — INCLUDING import type
  const re1 = /(from\s+)(['"])(\.\.?\/[^'"]*?)\2/g
  newSrc = newSrc.replace(re1, (m, prefix, q, p) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(p)) return m
    changed = true
    return `${prefix}${q}${p}.js${q}`
  })

  // Pattern 2: export * from './relative'
  const re2 = /(export\s*\*\s*from\s+)(['"])(\.\.?\/[^'"]*?)\2/g
  newSrc = newSrc.replace(re2, (m, prefix, q, p) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(p)) return m
    changed = true
    return `${prefix}${q}${p}.js${q}`
  })

  // Pattern 3: import './relative' (side-effect import)
  const re3 = /(^|\n)(import\s+)(['"])(\.\.?\/[^'"]*?)\3/g
  newSrc = newSrc.replace(re3, (m, pre, prefix, q, p) => {
    if (/\.(js|ts|json|mjs|cjs)$/.test(p)) return m
    changed = true
    return `${pre}${prefix}${q}${p}.js${q}`
  })

  if (changed) {
    fs.writeFileSync(file, newSrc)
    modified++
    console.log(`[modified] ${path.relative(SDK_ROOT, file)}`)
  }
}

const srcRoots = []
for (const pkg of fs.readdirSync(path.join(SDK_ROOT, 'packages'))) {
  const pkgDir = path.join(SDK_ROOT, 'packages', pkg)
  if (!fs.statSync(pkgDir).isDirectory()) continue
  if (pkg === 'business') {
    for (const sub of fs.readdirSync(pkgDir)) {
      const subDir = path.join(pkgDir, sub)
      if (fs.statSync(subDir).isDirectory()) {
        const srcDir = path.join(subDir, 'src')
        if (fs.existsSync(srcDir)) srcRoots.push(srcDir)
      }
    }
  } else {
    const srcDir = path.join(pkgDir, 'src')
    if (fs.existsSync(srcDir)) srcRoots.push(srcDir)
  }
}

for (const dir of srcRoots) {
  const files = []
  walk(dir, files)
  for (const f of files) processFile(f)
}

console.log(`\nModified ${modified} files`)
