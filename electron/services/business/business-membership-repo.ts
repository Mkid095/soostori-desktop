/**
 * business-membership-repo.ts — Membership methods for DesktopBusinessRepository.
 * Part of desktop-business-repository split per ANPAS.
 */

import { asShopId, asUserId, type UUID } from '@soostori/core'
import type { Membership, PersonMemberships } from '@soostori/business'
import type { Business } from '@soostori/business'
import { getDatabase } from '../../database'
import { rowToMembership, pickRole } from './business-mappers'
import type { PersonRow } from './business-person-repo'

interface ShopRow { id: string; name: string; currency: string; created_at: string }

export class DesktopMembershipRepository {
  private readonly db = getDatabase()

  async findMembership(id: UUID): Promise<Membership | null> {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id as string) as PersonRow | undefined
    return row ? rowToMembership(row, asShopId(row.shop_id)) : null
  }

  async findMemberships(personId: UUID): Promise<Membership[]> {
    const rows = this.db.prepare('SELECT * FROM employees WHERE id = ?').all(personId as string) as PersonRow[]
    return rows.map(r => {
      const businessId = asShopId(r.shop_id)
      return {
        id: asUserId(`m_${r.id}`), personId: asUserId(r.id), businessId,
        role: pickRole(r.role), permissions: null,
        status: r.is_active === 1 ? 'active' : 'suspended',
        invitedAt: r.created_at, joinedAt: r.created_at,
        createdAt: r.created_at, updatedAt: r.created_at,
      }
    })
  }

  async findMembershipsByBusiness(businessId: UUID): Promise<Membership[]> {
    const rows = this.db.prepare('SELECT * FROM employees WHERE shop_id = ?').all(businessId as string) as PersonRow[]
    return rows.map(r => rowToMembership(r, businessId))
  }

  async createMembership(data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'invitedAt'>): Promise<Membership> {
    let row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(data.personId as string) as PersonRow | undefined
    const now = new Date().toISOString()
    if (!row) {
      this.db.prepare(
        `INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at) VALUES (?, ?, '', '', '', ?, 1, ?)`,
      ).run(data.personId as string, data.businessId as string, data.role, now)
      row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(data.personId as string) as PersonRow
    }
    return { ...data, id: asUserId(`m_${data.personId}`), invitedAt: now, createdAt: now, updatedAt: now }
  }

  async updateMembership(id: UUID, _changes: Partial<Membership>): Promise<Membership> {
    return (await this.findMembership(id)) as Membership
  }

  async revokeMembership(id: UUID): Promise<void> {
    const ts = (id as string).replace(/^m_/, '')
    this.db.prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(ts)
  }

  async getPersonMemberships(personId: UUID): Promise<PersonMemberships | null> {
    const personRow = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(personId as string) as PersonRow | undefined
    if (!personRow) return null
    const memberships = await this.findMemberships(personId)
    const hydrated: Array<Membership & { business: Business }> = []
    for (const m of memberships) {
      const bizRow = this.db.prepare('SELECT * FROM shops WHERE id = ?').get(m.businessId as string) as ShopRow | undefined
      if (bizRow) {
        const slug = bizRow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        hydrated.push({
          ...m,
          business: {
            id: m.businessId, name: bizRow.name, slug: slug || 'shop',
            taxRate: 0, plan: 'free', subscriptionExpiry: null,
            status: 'active', currency: bizRow.currency,
            createdAt: bizRow.created_at, updatedAt: bizRow.created_at,
            ownerPersonId: personId,
          },
        })
      }
    }
    return {
      person: { id: asUserId(personRow.id), cloudUserId: '', email: '', displayName: personRow.name, phone: null, createdAt: personRow.created_at, updatedAt: personRow.created_at },
      memberships: hydrated,
    }
  }
}
