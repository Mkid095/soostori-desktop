/**
 * cloud-entity-customer.ts — Customer push/pull to cloud InstantDB.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export async function pushCustomer(customerId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as Record<string, unknown> | undefined
  if (!cust) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'customers', customerId, {
        id: customerId,
        shopId: (cust.shop_id as string) ?? '',
        name: cust.name as string,
        phone: cust.phone as string | null,
        email: cust.email as string | null,
        idNumber: cust.id_number as string | null,
        address: cust.address as string | null,
        notes: cust.notes as string | null,
        isActive: cust.is_active as number ?? 1,
        createdAt: cust.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushCustomer failed:', err)
  }
}

export async function pullCustomers(shopId: string): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const result = await instant.instaqQuery(APP_ID, { customers: { $: { where: { shopId } } } })
    const rows = (result as { customers?: unknown[] }).customers ?? []
    let count = 0
    for (const row of rows) {
      const c = row as Record<string, unknown>
      const localId = String(c.id ?? '').replace(/^customers_/, '')
      if (!localId) continue
      db.prepare(`
        INSERT OR REPLACE INTO customers (id, name, phone, email, address, notes, is_active, id_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(localId, (c.name as string) || '', (c.phone as string) || null,
        (c.email as string) || null, (c.address as string) || null, (c.notes as string) || null,
        (c.isActive as number) ?? 1, (c.idNumber as string) || null)
      count++
    }
    log.debug(`pullCustomers: pulled ${count} customers`)
    return count
  } catch (err) {
    log.warn('pullCustomers failed:', err)
    return 0
  }
}
