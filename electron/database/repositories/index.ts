/**
 * Desktop repository adapters — public boundary.
 *
 * Exposes `DesktopRepository<T>` as a generic factory for the SDK
 * `@soostori/storage.Repository<T>` contract. Entity-specific row shapes are
 * owned by the consumer (handlers, services) that knows the table columns.
 *
 * Phase 11.1 establishes only the adapter boundary. Per-domain migration
 * (products, customers, debts, business, sales, inventory) is reserved for
 * Phase 11.2+.
 */

import { DesktopRepository } from './desktop-repository'
export { DesktopRepository }

/**
 * Pre-bound repository factory — used by Phase 11.2 domain migrations.
 *
 * The platform adapter is intentionally generic. Entity-bound row shapes
 * and validation belong to the consumer side; this factory simply fixes
 * the SQLite table name + the canonical "id" column convention.
 */
export function repositoryFor<T>(tableName: string): DesktopRepository<T> {
  return new DesktopRepository<T>(tableName, 'id')
}
