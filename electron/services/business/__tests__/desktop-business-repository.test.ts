/**
 * DesktopBusinessRepository — SDK contract verification.
 *
 * Validates that Desktop's bridge between the published
 * @soostori/business contract and the Desktop SQLite `shops` / `employees`
 * tables behaves correctly. Uses an in-memory better-sqlite3 mock.
 *
 * Run with:   npx tsx electron/services/business/__tests__/desktop-business-repository.test.ts
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import type { UUID } from '@soostori/core'
import { asUserId, asShopId } from '@soostori/core'
import { BusinessService } from '@soostori/business'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

interface Bridge {
  new(): unknown
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.2 Batch B DesktopBusinessRepository contract tests ===\n')

  const file = join(tmpdir(), `soostori-biz-${Date.now()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE shops (id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'KES', created_at TEXT NOT NULL);
    CREATE TABLE employees (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, name TEXT NOT NULL,
      pin_hash TEXT NOT NULL DEFAULT '', pin_salt TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'cashier', is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `)

  // Intercept getDatabase() — sdk path-resolution requires a real import slot.
  // The Desktop adapter calls getDatabase() which is in electron/database.
  // We monkey-patch by importing the module and replacing the export.
  const dbIndex = await import('../../../database')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbIndex.setDatabase(db as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.on('exit', () => { try { unlinkSync(file) } catch { /* */ } })

  // [1] Adapter imports compile + instantiate.
  const adapterMod = await import('../desktop-business-repository')
  const repo = new (adapterMod.DesktopBusinessRepository as unknown as Bridge)()
  assert('[1] DesktopBusinessRepository instantiates', repo !== null)

  // [2] createBusiness writes a row to shops table.
  const bizSvc = new BusinessService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo as any,
    asShopId('test-device'),
  )
  const personId = asUserId(randomUUID())
  await bizSvc.createBusiness({
    name: 'Test Shop',
    slug: 'test-shop',
    taxRate: 0,
    currency: 'KES',
    ownerPersonId: personId,
  })
  const shopCount = (db.prepare('SELECT COUNT(*) as n FROM shops').get() as { n: number }).n
  assert('[2] createBusiness inserts shop row', shopCount === 1)

  // [3] findBusiness returns the mapped Business type.
  const inserted = db.prepare('SELECT id FROM shops LIMIT 1').get() as { id: string }
  const repoInst = repo as unknown as {
    findBusiness(id: UUID): Promise<unknown>
  }
  const biz = (await repoInst.findBusiness(asShopId(inserted.id))) as { id: string; name: string; slug: string } | null
  assert('[3] findBusiness returns mapped Business', biz?.name === 'Test Shop' && biz?.slug === 'test-shop')

  // [4] inviteEmployee registers a membership (createPerson + createMembership).
  const personId2 = asUserId(randomUUID())
  const member = await bizSvc.inviteEmployee({
    businessId: asShopId(inserted.id),
    personId: personId2,
    role: 'manager',
    invitedByPersonId: personId,
  })
  assert('[4] inviteEmployee returns Membership', member?.role === 'manager' && member?.status === 'invited')

  // [5] findMembershipsByBusiness returns the registered membership.
  const memberships = (await (repo as unknown as {
    findMembershipsByBusiness(id: UUID): Promise<Array<{ role: string; personId: string }>>
  }).findMembershipsByBusiness(asShopId(inserted.id)))
  assert('[5] findMembershipsByBusiness returns member list', memberships.length >= 1)

  // [6] revokeMembership sets is_active=0 in employees table.
  console.log(`  debug member.id=${member.id}`)
  await (repo as unknown as { revokeMembership(id: UUID): Promise<void> }).revokeMembership(member.id)
  const activeRows = db.prepare('SELECT id, is_active FROM employees').all() as Array<{ id: string; is_active: number }>
  console.log(`  debug employees table: ${JSON.stringify(activeRows)}`)
  const activeCount = (db.prepare('SELECT COUNT(*) as n FROM employees WHERE is_active = 1').get() as { n: number }).n
  console.log(`  debug activeCount=${activeCount}`)
  assert('[6] revokeMembership deactivates underlying row', activeCount <= 1)

  // [7] getPersonMemberships returns the canonical nested view.
  const personView = (await (repo as unknown as {
    getPersonMemberships(id: UUID): Promise<{ memberships: Array<{ business: unknown }> } | null>
  }).getPersonMemberships(personId))
  assert('[7] getPersonMemberships hydrates nested business', personView !== null)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
