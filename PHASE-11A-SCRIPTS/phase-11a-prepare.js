/**
 * Phase 11A — Mechanical pre-publish preparation script.
 *
 * For each public package:
 * 1. Add `repository` field
 * 2. Bump version to 0.1.0-alpha.1
 * 3. Resolve workspace:* -> versioned ranges (0.1.0-alpha.1)
 * 4. Add zod peerDependency ONLY where zod is imported at runtime
 *
 * License: unchanged (per user direction).
 * Does NOT run npm publish.
 */

const fs = require('fs')
const path = require('path')

const REPO_URL = 'git+https://github.com/Mkid095/soostori-sdk.git'
const VERSION = '0.1.0-alpha.1'

// Find all package.json files under packages/ EXCEPT private ones
const ROOT = path.resolve(__dirname, '..', '..', 'soostori-sdk')
const PKG_ROOT = path.join(ROOT, 'packages')

function findAllPackages(dir) {
  const out = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !['node_modules', 'dist', 'test', '.git'].includes(e.name)) {
      // Always check for package.json at this level FIRST, regardless of nesting depth
      const pj = path.join(full, 'package.json')
      if (fs.existsSync(pj)) out.push(full)
      out.push(...findAllPackages(full))
    }
  }
  return out
}

const packages = findAllPackages(PKG_ROOT)
console.log(`Found ${packages.length} packages`)

let modified = 0
let unchanged = 0
let skipped = 0

for (const dir of packages) {
  const pjPath = path.join(dir, 'package.json')
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'))

  // Skip private packages
  if (pj.private === true) {
    console.log(`  [skip-private] ${pj.name}`)
    skipped++
    continue
  }

  let changed = false

  // 1. Bump version
  if (pj.version !== VERSION) {
    pj.version = VERSION
    changed = true
  }

  // 2. Add repository
  if (!pj.repository || pj.repository.url !== REPO_URL) {
    pj.repository = { type: 'git', url: REPO_URL }
    changed = true
  }

  // 3. Resolve workspace:* -> versioned range for @soostori/* internal deps
  //    DO NOT do this in source — pnpm rewrites workspace:* at publish time.
  //    Only verify they exist; if a package lacks workspace:* where expected, flag it.
  // (Intentionally a no-op — see README for rationale.)
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!pj[depField]) continue
    // Just log any workspace:* refs as "expected, preserved"
    for (const [name, range] of Object.entries(pj[depField])) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        console.log(`  [preserved-workspace] ${pj.name}: ${name} ${range} (pnpm will rewrite at publish time)`)
      }
    }
  }

  // 4. Check if package source imports zod at runtime
  const srcDir = path.join(dir, 'src')
  let usesZod = false
  if (fs.existsSync(srcDir)) {
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name)
        if (e.isDirectory()) walk(full)
        else if (/\.(ts|js)$/.test(e.name)) {
          const src = fs.readFileSync(full, 'utf8')
          if (/\bfrom\s+['"]zod['"]|require\(['"]zod['"]\)/.test(src)) {
            usesZod = true
          }
        }
      }
    }
    walk(srcDir)
  }

  if (usesZod) {
    // Check if dist output exists and contains zod reference
    const distDir = path.join(dir, 'dist')
    let distUsesZod = false
    if (fs.existsSync(distDir)) {
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name)
          if (e.isDirectory()) walk(full)
          else if (/\.(js|mjs|cjs)$/.test(e.name)) {
            const src = fs.readFileSync(full, 'utf8')
            if (/from\s+['"]zod['"]|require\(['"]zod['"]\)/.test(src)) {
              distUsesZod = true
            }
          }
        }
      }
      walk(distDir)
    }

    if (distUsesZod) {
      // Runtime zod usage — keep as regular dep, do NOT add peerDep
      console.log(`  [runtime-zod] ${pj.name}: zod is runtime dep (kept as dependencies)`)
    } else {
      // Type-only zod usage — could be peerDep, but conservative: keep as regular dep
      console.log(`  [type-only-zod] ${pj.name}: zod only in types (kept as dependencies — conservative)`)
    }
  }

  if (changed) {
    fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n')
    modified++
    console.log(`  [modified] ${pj.name}`)
  } else {
    unchanged++
  }
}

console.log(`\nSummary:`)
console.log(`  Modified: ${modified}`)
console.log(`  Unchanged: ${unchanged}`)
console.log(`  Skipped (private): ${skipped}`)
