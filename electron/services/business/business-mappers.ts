/**
 * business-mappers.ts — Row → domain type mappers for DesktopBusinessRepository.
 * Part of desktop-business-repository split per ANPAS.
 */

import { asShopId, asUserId } from '@soostori/core'
import type { Business, Person, Membership } from '@soostori/business'
import type { PersonRow } from './business-person-repo'

interface ShopRow { id: string; name: string; currency: string; created_at: string }

export function rowToPerson(row: PersonRow): Person {
  return {
    id: asUserId(row.id), cloudUserId: '', email: '',
    displayName: row.name, phone: null,
    createdAt: row.created_at, updatedAt: row.created_at,
  }
}

export function rowToBusiness(row: ShopRow, ownerId: import('@soostori/core').UUID): Business {
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return {
    id: asShopId(row.id), name: row.name, slug: slug || 'shop',
    taxRate: 0, plan: 'free', subscriptionExpiry: null,
    status: row.id ? 'active' : 'inactive', currency: row.currency,
    createdAt: row.created_at, updatedAt: row.created_at, ownerPersonId: ownerId,
  }
}

export function pickRole(role: string): Membership['role'] {
  if (['owner', 'manager', 'cashier', 'attendant', 'viewer'].includes(role)) return role as Membership['role']
  return 'cashier'
}

export function rowToMembership(row: PersonRow, businessId: import('@soostori/core').UUID): Membership {
  return {
    id: asUserId(`m_${row.id}`), personId: asUserId(row.id), businessId,
    role: pickRole(row.role), permissions: null,
    status: row.is_active === 1 ? 'active' : 'suspended',
    invitedAt: row.created_at, joinedAt: row.created_at,
    createdAt: row.created_at, updatedAt: row.created_at,
  }
}
