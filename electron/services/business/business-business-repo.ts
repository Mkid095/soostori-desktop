/**
 * business-business-repo.ts — Business methods for DesktopBusinessRepository.
 * Part of desktop-business-repository split per ANPAS.
 */

import { newId, asShopId, asUserId, type UUID } from '@soostori/core'
import type { Business } from '@soostori/business'
import { getDatabase } from '../../database'
import { rowToBusiness } from './business-mappers'

interface ShopRow {
  id: string; name: string; currency: string; created_at: string
}

export class DesktopBusinessRepositoryImpl {
  private readonly db = getDatabase()

  async findBusiness(id: UUID): Promise<Business | null> {
    const row = this.db.prepare('SELECT * FROM shops WHERE id = ?').get(id as string) as ShopRow | undefined
    if (!row) return null
    const owner = this.db.prepare("SELECT id FROM employees WHERE shop_id = ? AND role = 'owner' LIMIT 1").get(id as string) as { id: string } | undefined
    return rowToBusiness(row, asUserId(owner?.id ?? id as string))
  }

  async findBusinessesByOwner(personId: UUID): Promise<Business[]> {
    const rows = this.db.prepare(`
      SELECT s.* FROM shops s JOIN employees e ON e.shop_id = s.id WHERE e.id = ? AND e.role = 'owner'
    `).all(personId as string) as ShopRow[]
    return rows.map(r => rowToBusiness(r, personId))
  }

  async createBusiness(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> {
    const id = newId() as UUID; const now = new Date().toISOString()
    this.db.prepare(`INSERT INTO shops (id, name, currency, created_at) VALUES (?, ?, ?, ?)`).run(id as string, data.name, data.currency || 'KES', now)
    return { ...data, id, createdAt: now, updatedAt: now }
  }

  async updateBusiness(id: UUID, _changes: Partial<Business>): Promise<Business> {
    return (await this.findBusiness(id)) as Business
  }

  async getActiveBusiness(): Promise<Business | null> {
    const row = this.db.prepare('SELECT * FROM shops LIMIT 1').get() as ShopRow | undefined
    if (!row) return null
    return this.findBusiness(asShopId(row.id))
  }
}
