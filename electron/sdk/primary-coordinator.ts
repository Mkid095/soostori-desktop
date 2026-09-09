/**
 * PrimaryDeviceCoordinator Desktop adapter — single canonical authority.
 *
 * Phase 11.2 collapses the 3 duplicate getPrimaryStatus / getAuthorityStatus
 * implementations (sale-orchestrator.ts, inventory-orchestrator.ts,
 * sync-service.ts) onto one @soostori/devices.PrimaryDeviceCoordinator
 * instance. Behavior is preserved bit-for-bit:
 *
 *   ONLINE       → stock authorization ALLOWED
 *   STALE        → DENIED (heartbeat > 15s old)
 *   LOST         → DENIED (heartbeat > 60s old)
 *   UNKNOWN      → DENIED (no primary established)
 *   REVOKED      → DENIED (handled in PrimaryDeviceState)
 *
 * Thresholds:
 *   STALE_THRESHOLD_MS = 15_000
 *   LOST_THRESHOLD_MS  = 60_000
 *
 * Same numbers as the previous inline implementations. The threshold values
 * live ONLY here after this migration.
 */

import { asShopId, asDeviceId, type UUID, type ShopId } from '@soostori/core'
import { PrimaryDeviceCoordinator } from '@soostori/devices'
import type { Heartbeat } from '@soostori/devices'

const STALE_THRESHOLD_MS = 15_000
const LOST_THRESHOLD_MS = 60_000

type PrimaryStatusName = 'online' | 'stale' | 'lost' | 'unknown'
export interface PrimaryStatus {
  status: PrimaryStatusName
  canAuthorStockOps: boolean
}

let _coord: PrimaryDeviceCoordinator | null = null
let _shopId: ShopId | null = null
let _localDeviceId: UUID | null = null
let _isHost = false

/**
 * One-shot initialization. Must be called before any other export. Idempotent.
 */
export function initPrimaryCoordinator(opts: { shopId: string; deviceId: string }): void {
  _shopId = asShopId(opts.shopId)
  _localDeviceId = asDeviceId(opts.deviceId)
  if (_coord) return
  _coord = new PrimaryDeviceCoordinator({
    shopId: _shopId,
    deviceId: _localDeviceId,
    // Preserve prior Desktop semantics:
    //   0 < age < 15s → online
    //   15s < age < 60s → stale
    //   age > 60s → lost (only via ONLINE→LOST edge case in the SDK)
    config: { freshnessMs: STALE_THRESHOLD_MS, lostGraceMs: LOST_THRESHOLD_MS },
  })
  ingestSelfHeartbeat()
}

/**
 * Mark this device as the LAN Primary (host mode) or a client terminal.
 * The Desktop previously updated this implicitly from sync-service.startHost();
 * that flow now goes through this adapter.
 */
export function setHostMode(isHost: boolean): void {
  _isHost = isHost
  ingestSelfHeartbeat()
  if (_coord) _coord.tick(Date.now())
}

/**
 * Feed a remote Primary heartbeat received via LAN discovery / sync protocol.
 * Replaces the in-process `primaryLastSeen` field that used to live on
 * SyncService.
 */
export function ingestPrimaryHeartbeat(fromDeviceId: string, timestampMs: number): void {
  if (!_coord || !_shopId || !_localDeviceId) return
  const hb: Heartbeat = {
    deviceId: fromDeviceId as UUID,
    shopId: _shopId,
    timestamp: new Date(timestampMs).toISOString(),
    isPrimary: true,
    reachable: true,
    stockSequence: 0,
  }
  _coord.ingestHeartbeat(hb)
}

/**
 * Refresh the coordinator's view of elapsed time. Call periodically
 * (5-second cadence matches host heartbeat in the SDK).
 */
export function tickPrimaryCoordinator(nowMs?: number): void {
  if (_coord) _coord.tick(nowMs ?? Date.now())
}

/**
 * Self-heartbeat issued by the host every 5s. Coalesces here so host mode
 * always reports ONLINE even when no remote Primary advert has arrived.
 */
function ingestSelfHeartbeat(): void {
  if (!_coord || !_shopId || !_localDeviceId) return
  const hb: Heartbeat = {
    deviceId: _localDeviceId,
    shopId: _shopId,
    timestamp: new Date().toISOString(),
    isPrimary: _isHost,
    reachable: true,
    stockSequence: 0,
  }
  _coord.ingestHeartbeat(hb)
}

/**
 * Canonical accessor — replaces the 3 duplicate copies.
 * Host mode is always ONLINE/authorized.
 */
export function getPrimaryStatus(): PrimaryStatus {
  if (!_coord) return { status: 'unknown', canAuthorStockOps: false }
  if (_isHost) return { status: 'online', canAuthorStockOps: true }
  const state = _coord.getPrimaryState()
  const ps = state.status
  const status: PrimaryStatusName = (ps === 'online' || ps === 'stale' || ps === 'lost')
    ? ps
    : (state.primaryId === null ? 'unknown' : 'unknown')
  const canAuthorStockOps = _coord.canAuthorStockOps()
  if (status === 'online') return { status, canAuthorStockOps: true }
  return { status, canAuthorStockOps: false }
}

/**
 * Sync-protocol flavour: status name only, no authorization flag.
 * Replaces SyncService.getAuthorityStatus.
 */
export function getAuthorityStatus(): PrimaryStatusName {
  return getPrimaryStatus().status
}

/** Static threshold accessors — only place these constants live now. */
export const PRIMARY_THRESHOLDS = {
  STALE_MS: STALE_THRESHOLD_MS,
  LOST_MS: LOST_THRESHOLD_MS,
} as const
