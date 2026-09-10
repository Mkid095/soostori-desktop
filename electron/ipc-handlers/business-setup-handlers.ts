/**
 * business-setup-handlers.ts — Phase 07: Business Setup IPC handler.
 *
 * Flow:
 *  1. Find or create Person
 *  2. Create Business
 *  3. Create Membership (person = owner)
 *  4. Create BusinessSettings (defaults: KES, Africa/Nairobi, KE)
 *  5. Create "Uncategorized" Category
 *  6. Return { businessId, ownerMembershipId, defaultCategoryId }
 */

import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { z } from 'zod'
import { getDatabase } from '../database'
import { getSyncStore } from '../services/store'
import { DesktopBusinessRepository } from '../services/business'
import { asDeviceId, asUserId, newId } from '@soostori/core'

const BusinessSetupInputSchema = z.object({
  businessName: z.string().min(2),
  businessType: z.enum(['retail', 'wholesale', 'supermarket', 'restaurant', 'salon', 'pharmacy', 'other']),
  country: z.string().default('KE'),
  currency: z.string().default('KES'),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerPhone: z.string().min(1),
})

interface BusinessSetupResult {
  businessId: string
  ownerMembershipId: string
  defaultCategoryId: string
}

export function registerBusinessSetupHandlers(): void {
  ipcMain.handle('db:business:setup', async (_event, rawInput: unknown): Promise<BusinessSetupResult> => {
    const input = BusinessSetupInputSchema.parse(rawInput)
    const db = getDatabase()
    const repo = new DesktopBusinessRepository()

    // 1 — Find or create Person
    let person = await repo.findPersonByEmail(input.ownerEmail || '').catch(() => null)
    if (!person) {
      // Phone lookup: scan employees table for matching phone (stored in shop_settings)
      // For now create a new person via the repo
      person = await repo.createPerson({
        displayName: input.ownerName,
        email: input.ownerEmail || '',
        phone: input.ownerPhone,
        cloudUserId: '',
      })
    }

    const personId = person.id

    // 2 — Create Business
    const slug = input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop'
    const business = await repo.createBusiness({
      name: input.businessName,
      slug,
      currency: input.currency,
      taxRate: 0,
      plan: 'free',
      subscriptionExpiry: null,
      status: 'active',
      ownerPersonId: personId,
    })

    const businessId = business.id

    // 3 — Create Membership (person is owner of business)
    // Create an employee record with role=owner for this business
    const ownerEmployeeId = newId() as import('@soostori/core').UUID
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, '', '', 'owner', 1, ?, ?)
    `).run(ownerEmployeeId as string, businessId as string, input.ownerName, now, now)

    // Also update the person's shop_id on the employees table if they already existed
    const membership = await repo.createMembership({
      personId,
      businessId,
      role: 'owner',
      status: 'active',
      permissions: null,
      joinedAt: now,
    })

    // 4 — Create BusinessSettings (defaults)
    const settingsId = uuidv4()
    db.prepare(`
      INSERT INTO shop_settings (id, name, currency, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, currency = excluded.currency, updated_at = excluded.updated_at
    `).run(settingsId, input.businessName, input.currency, businessId as string, now, now)

    // Also stamp the shops table with the right currency
    db.prepare(`UPDATE shops SET currency = ? WHERE id = ?`).run(input.currency, businessId as string)

    // 5 — Create "Uncategorized" default category
    const categoryId = uuidv4()
    db.prepare(`
      INSERT INTO categories (id, name, description, shop_id, created_at, updated_at)
      VALUES (?, 'Uncategorized', 'Default product category', ?, ?, ?)
    `).run(categoryId, businessId as string, now, now)

    // 6 — Update active shop in sync store (set as the active business)
    try {
      const store = getSyncStore()
      store.set('shopId', businessId as string)
    } catch {
      // Non-fatal — store may not be available
    }

    log.info(`BusinessSetup: created business=${businessId} owner=${ownerEmployeeId} category=${categoryId}`)

    return {
      businessId: businessId as string,
      ownerMembershipId: membership.id as string,
      defaultCategoryId: categoryId,
    }
  })

  ipcMain.handle('db:business:listForUser', async (_event, _userId?: string): Promise<unknown[]> => {
    const db = getDatabase()
    // Return all shops the current device has created/found
    // (multi-business aware: query shops table)
    const rows = db.prepare('SELECT id, name, currency, created_at FROM shops ORDER BY created_at DESC').all() as { id: string; name: string; currency: string; created_at: string }[]
    return rows.map((row) => {
      const memberCount = db.prepare(
        "SELECT COUNT(*) as cnt FROM employees WHERE shop_id = ? AND is_active = 1"
      ).get(row.id) as { cnt: number }
      return { ...row, memberCount: memberCount.cnt }
    })
  })

  ipcMain.handle('db:business:setActive', async (_event, businessId: string): Promise<void> => {
    try {
      const store = getSyncStore()
      store.set('shopId', businessId)
      log.info(`Active business switched to: ${businessId}`)
    } catch (err) {
      log.warn('Failed to set active business in store:', err)
    }
  })

  ipcMain.handle('db:business:getActive', async (): Promise<string | null> => {
    try {
      const store = getSyncStore()
      return store.get('shopId') || null
    } catch {
      return null
    }
  })

  log.info('Business Setup IPC handlers registered')
}
