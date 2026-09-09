/**
 * Audit recorder — Desktop thin adapter.
 *
 * Phase 11.2 Batch D: introduces the published @soostori/audit surface so
 * Desktop code can emit structured audit events through one canonical
 * pipeline. The persistence/integration boundary remains Desktop-specific
 * (writes to electron-store or local files; sent to cloud over existing
 * InstantDB bridge later).
 */

import { AuditRecorder, type AuditStorage, type AuditEntry, type AuditFilter } from '@soostori/audit'

export { AuditRecorder }
export type { AuditEntry, AuditFilter }

/**
 * In-memory AuditStorage — used by tests and Desktop dev mode.
 * Production wires AuditRecorder(AuditStorage) to electron-store.
 */
class InMemoryAuditStorage implements AuditStorage {
  readonly entries: AuditEntry[] = []
  async append(entry: AuditEntry): Promise<void> { this.entries.push(entry) }
  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    return this.entries.filter((e) => {
      if (filter.entityId && e.entityId !== filter.entityId) return false
      if (filter.entityType && e.entityType !== filter.entityType) return false
      if (filter.actorId && e.actorId !== filter.actorId) return false
      if (filter.eventName && e.eventName !== filter.eventName) return false
      return true
    })
  }
  async countByEventName(filter: AuditFilter): Promise<Record<string, number>> {
    const result: Record<string, number> = {}
    const filtered = await this.query(filter)
    for (const e of filtered) {
      result[e.eventName] = (result[e.eventName] ?? 0) + 1
    }
    return result
  }
}

/** Factory: build a Desktop-side recorder backed by an in-memory store. */
export function createInMemoryAuditRecorder(): AuditRecorder {
  return new AuditRecorder(new InMemoryAuditStorage())
}

