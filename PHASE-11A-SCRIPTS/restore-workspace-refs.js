/**
 * Phase 11A — Restore workspace:* references using absolute git path.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const SDK_ROOT = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'

function getOriginal(relPath) {
  try {
    return execSync(`git -C "${SDK_ROOT}" show HEAD:${relPath}`, { encoding: 'utf8' })
  } catch {
    return null
  }
}

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

const packages = findAllPackages(path.join(SDK_ROOT, 'packages'))
let restored = 0

for (const dir of packages) {
  const pjPath = path.join(dir, 'package.json')
  // Compute relative path from SDK_ROOT (use forward slashes for git)
  const relPath = path.relative(SDK_ROOT, pjPath).split(path.sep).join('/')

  const original = getOriginal(relPath)
  if (!original) continue

  const origPJ = JSON.parse(original)
  const currPJ = JSON.parse(fs.readFileSync(pjPath, 'utf8'))

  if (currPJ.private === true) continue

  let changed = false
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!origPJ[depField] || !currPJ[depField]) continue
    for (const [name, origRange] of Object.entries(origPJ[depField])) {
      if (typeof origRange === 'string' && origRange.startsWith('workspace:')) {
        if (currPJ[depField][name] !== origRange) {
          currPJ[depField][name] = origRange
          changed = true
          console.log(`  [restored] ${currPJ.name}: ${name} -> ${origRange}`)
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(pjPath, JSON.stringify(currPJ, null, 2) + '\n')
    restored++
  }
}

console.log(`\nRestored ${restored} packages`)
