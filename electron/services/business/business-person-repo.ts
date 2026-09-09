/**
 * business-person-repo.ts — Person methods for DesktopBusinessRepository.
 * Part of desktop-business-repository split per ANPAS.
 */

import { newId, asUserId, type UUID } from '@soostori/core'
import type { Person } from '@soostori/business'
import { getDatabase } from '../../database'
import { rowToPerson } from './business-mappers'

export interface PersonRow {
  id: string; shop_id: string; name: string; pin_hash: string
  pin_salt: string; role: string; is_active: number; created_at: string
}

export class DesktopPersonRepository {
  private readonly db = getDatabase()

  async findPerson(id: UUID): Promise<Person | null> {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id as string) as PersonRow | undefined
    return row ? rowToPerson(row) : null
  }

  async findPersonByCloudId(_cloudUserId: string): Promise<Person | null> {
    const row = this.db.prepare('SELECT * FROM employees LIMIT 1').get() as PersonRow | undefined
    return row ? rowToPerson(row) : null
  }

  async findPersonByEmail(_email: string): Promise<Person | null> {
    const row = this.db.prepare('SELECT * FROM employees LIMIT 1').get() as PersonRow | undefined
    return row ? rowToPerson(row) : null
  }

  async createPerson(data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    const id = newId() as UUID; const now = new Date().toISOString()
    this.db.prepare(
      `INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at) VALUES (?, ?, ?, '', '', 'cashier', 1, ?)`,
    ).run(id as string, '', data.displayName, now)
    return { ...data, id, createdAt: now, updatedAt: now }
  }

  async updatePerson(id: UUID, _changes: Partial<Person>): Promise<Person> {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id as string) as PersonRow | undefined
    if (!row) throw new Error(`Person ${id} not found`)
    return rowToPerson(row)
  }
}
