/**
 * partner-event-emitter.ts — Phase 18: emit partner SyncEvents from Desktop.
 *
 * conversion.qualified is emitted when a qualifying business event occurs:
 *   - Salesperson successfully syncs enrolled businesses from cloud
 *   - At least one enrolled business is active
 *
 * The event is enqueued to the local sync queue for upload to cloud.
 * Idempotent on event idempotencyKey.
 */

import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import log from 'electron-log'
import type { SyncEvent } from '@soostori/contracts'

function getDeviceId(): string {
  try {
    const { getSyncStore } = require('../services/store')
    return (getSyncStore().get('deviceId') as string) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** Build a conversion.qualified SyncEvent payload. */
function buildConversionQualifiedEvent(params: {
  businessId: string
  businessName: string
  salespersonId: string
  influencerId?: string
  packageId: string
  packageAmount: number
}): SyncEvent {
  const { v4: uuidv4 } = require('uuid')
  const now = new Date().toISOString()
  return {
    id: uuidv4() as SyncEvent['id'],
    idempotencyKey: `conversion.qualified:${params.salespersonId}:${params.businessId}:${params.packageId}` as SyncEvent['idempotencyKey'],
    businessId: params.businessId as SyncEvent['businessId'],
    entityKind: 'conversion' as SyncEvent['entityKind'],
    entityId: params.packageId,
    operation: 'create',
    originatingDeviceId: getDeviceId() as SyncEvent['originatingDeviceId'],
    originatingEmployeeId: '' as SyncEvent['originatingEmployeeId'],
    clientSequence: 0,
    clientCreatedAt: now,
    entityVersion: 1,
    payload: {
      type: 'conversion.qualified',
      businessId: params.businessId,
      businessName: params.businessName,
      salespersonId: params.salespersonId,
      influencerId: params.influencerId ?? null,
      packageId: params.packageId,
      packageAmount: params.packageAmount,
      qualifiedAt: now,
    },
    state: 'pending',
  }
}

/** Emit a conversion.qualified event for an active enrolled business. */
export async function emitConversionQualified(params: {
  businessId: string
  businessName: string
  salespersonId: string
  influencerId?: string
  packageId: string
  packageAmount: number
}): Promise<{ emitted: boolean; error?: string }> {
  try {
    const db = getDatabase()
    const deviceId = getDeviceId()
    const shopId = await resolveActiveShopId()
    const event = buildConversionQualifiedEvent(params)

    // Check idempotency — skip if already queued
    const existing = db.prepare(
      'SELECT id FROM sync_events WHERE idempotency_key = ?'
    ).get(event.idempotencyKey)
    if (existing) {
      log.debug(`PartnerEventEmitter: conversion.qualified already queued for ${params.packageId}`)
      return { emitted: false }
    }

    db.prepare(`
      INSERT OR IGNORE INTO sync_events
        (id, shop_id, device_id, event_type, sequence_number, payload,
         idempotency_key, version, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      shopId,
      deviceId,
      'conversion.qualified',
      0,
      JSON.stringify(event.payload),
      event.idempotencyKey,
      event.entityVersion,
      event.clientCreatedAt,
      new Date().toISOString(),
    )

    log.info(`PartnerEventEmitter: conversion.qualified emitted for business ${params.businessId}`)
    return { emitted: true }
  } catch (err) {
    log.error('PartnerEventEmitter: failed to emit conversion.qualified', err)
    return { emitted: false, error: String(err) }
  }
}
