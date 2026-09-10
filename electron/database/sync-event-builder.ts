/**
 * sync-event-builder.ts — Pure factory for the Sale SyncEvent.
 *
 * Cycle 04 Sub-cycle F: extracted from sale-create-handlers.ts so the
 * SyncEvent shape is unit-testable without instantiating the IPC handler,
 * the SQLite database, or the sales orchestrator. The handler invokes
 * this after the SQLite INSERT succeeds and passes the result to
 * defaultSyncEngine.enqueue().
 *
 * ANPAS: ≤150 lines.
 */

import { v4 as uuidv4 } from 'uuid'
import { asBusinessId, asSaleId, asEmployeeId, asDeviceId, asSyncEventId, asIdempotencyKey } from '@soostori/core'
import type { SyncEvent } from '@soostori/contracts'
import type { Sale } from '@soostori/contracts'
import type { BusinessId, DeviceId, EmployeeId } from '@soostori/core'

export interface SaleSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  /** Per-device monotonic sequence (caller owns the counter). */
  clientSequence: number
}

/** Build a SyncEvent<Sale> for a freshly-inserted Sale row. */
export const buildSaleSyncEvent = (
  sale: Sale,
  ctx: SaleSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(sale.idempotencyKey),
  businessId: asBusinessId(sale.businessId),
  entityKind: 'sale',
  entityId: asSaleId(sale.id),
  operation: 'create',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: sale.version,
  payload: sale as unknown as Record<string, unknown>,
  state: 'pending',
})