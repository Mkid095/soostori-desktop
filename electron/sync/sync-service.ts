import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import type { SyncEvent, SyncMessage, ClientMessageType, DiscoveryAdvert } from './types'
import { SyncServer } from './server'
import { SyncClient } from './client'
import { DiscoveryService } from './discovery-service'
import { dispatchSyncStatus } from './sync-service-core'
import { sendSalePending, sendLocalMutation } from './sync-service-messages'
import {
  ingestPrimaryHeartbeat,
  getAuthorityStatus as getCanonicalAuthorityStatus,
  setHostMode,
  tickPrimaryCoordinator,
} from '../sdk/primary-coordinator'
import { applyStockAdjusted, applySaleConfirmed, applySaleRefunded, applyProductEvent } from './sync-service-apply'
import { startHeartbeat, stopHeartbeat } from './sync-service-heartbeat'

export type AuthorityStatus = 'online' | 'stale' | 'lost' | 'unknown'
type SyncEventCallback = (event: SyncEvent) => void
type HostDiscoveredCallback = (advert: DiscoveryAdvert) => void

class SyncService {
  private server: SyncServer | null = null
  private client: SyncClient | null = null
  private discovery: DiscoveryService | null = null
  private eventListeners = new Set<SyncEventCallback>()
  private hostListeners = new Set<HostDiscoveredCallback>()
  private deviceId = ''
  private userId = ''
  private shopId = ''
  private shopName = ''
  private deviceName = ''
  private wsPort = 18792
  private mode: 'host' | 'client' | 'offline' = 'offline'
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private tickInterval: ReturnType<typeof setInterval> | null = null

  configure(opts: {
    deviceId: string; userId: string; shopId: string; shopName: string
    deviceName: string; deviceType: 'desktop' | 'mobile'; employeeId: string
    employeeName: string; appVersion: string; wsPort?: number
  }): void {
    this.deviceId = opts.deviceId; this.userId = opts.userId; this.shopId = opts.shopId
    this.wsPort = opts.wsPort ?? 18792; this.shopName = opts.shopName; this.deviceName = opts.deviceName
    this.discovery = new DiscoveryService({
      shopId: opts.shopId, shopName: opts.shopName, deviceId: opts.deviceId,
      deviceName: opts.deviceName, deviceType: opts.deviceType, isHost: false,
      wsPort: this.wsPort, employeeId: opts.employeeId, employeeName: opts.employeeName,
      appVersion: opts.appVersion,
    })
    this.discovery.on('host discovered', (adv: DiscoveryAdvert) => {
      if (adv.isHost) ingestPrimaryHeartbeat(adv.deviceId, adv.last_seen_ms)
      this.hostListeners.forEach(cb => cb(adv))
    })
    this.discovery.start(); this.startTickInterval()
    log.info(`Discovery: started for device ${opts.deviceId}`)
  }

  startHost(port?: number): void {
    if (this.mode !== 'offline') this.stop()
    this.mode = 'host'; const p = port ?? this.wsPort
    if (this.discovery) this.discovery.stop()
    this.discovery = new DiscoveryService({
      shopId: this.shopId, shopName: this.shopName, deviceId: this.deviceId,
      deviceName: this.deviceName, deviceType: 'desktop', isHost: true, wsPort: p,
      employeeId: this.userId, employeeName: '', appVersion: '',
    })
    this.discovery.on('host discovered', (adv: DiscoveryAdvert) => {
      if (adv.isHost) ingestPrimaryHeartbeat(adv.deviceId, adv.last_seen_ms)
      this.hostListeners.forEach(cb => cb(adv))
    })
    this.discovery.start()
    this.server = new SyncServer(this.deviceId, this.userId, this.shopId)
    this.server.start(p)
    this.heartbeatInterval = startHeartbeat(this.deviceId)
    this.startTickInterval(); setHostMode(true)
    log.info(`SyncService: host mode started on port ${p}`)
    dispatchSyncStatus('online')
  }

  startClient(hostUrl: string, deviceToken = ''): void {
    if (this.mode !== 'offline') this.stop()
    this.mode = 'client'; setHostMode(false)
    this.client = new SyncClient(async (event: SyncEvent) => {
      if (event.eventType === 'STOCK_ADJUSTED') applyStockAdjusted(event)
      else if (event.eventType === 'SALE_CONFIRMED') await applySaleConfirmed(event)
      else if (event.eventType === 'SALE_REFUNDED') applySaleRefunded(event)
      else if (['PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DELETED','CATEGORY_CREATED','CATEGORY_UPDATED','PRICE_CHANGED'].includes(event.eventType)) applyProductEvent(event)
      this.eventListeners.forEach(cb => cb(event))
      dispatchSyncStatus('syncing'); setTimeout(() => dispatchSyncStatus('online'), 500)
    })
    this.client.connect(hostUrl, deviceToken)
    log.info(`SyncService: client mode connecting to ${hostUrl}`)
  }

  stop(): void {
    if (this.heartbeatInterval) stopHeartbeat(this.heartbeatInterval)
    this.stopTickInterval()
    if (this.server) { this.server.stop(); this.server = null }
    if (this.client) { this.client.disconnect(); this.client = null }
    if (this.discovery) { this.discovery.stop(); this.discovery = null }
    setHostMode(false); this.mode = 'offline'; dispatchSyncStatus('offline')
  }

  broadcast(event: SyncEvent, idempotencyKey?: string): void {
    const key = idempotencyKey ?? uuidv4()
    if (this.mode === 'host' && this.server) this.server.broadcast(event)
    else if (this.mode === 'client' && this.client) {
      const msg: SyncMessage = { type: event.eventType as ClientMessageType, payload: event.payload,
        deviceId: event.deviceId, userId: event.userId, sequenceNumber: event.sequenceNumber, idempotencyKey: key }
      this.client.send(msg)
    }
  }

  onEvent(cb: SyncEventCallback): () => void { this.eventListeners.add(cb); return () => this.eventListeners.delete(cb) }
  onHostDiscovered(cb: HostDiscoveredCallback): () => void { this.hostListeners.add(cb); return () => this.hostListeners.delete(cb) }
  getMode(): typeof this.mode { return this.mode }

  sendSalePending(saleData: { saleId: string; items: Array<{ productId: string; quantity: number }>; total: number; paymentMethod: string }): string {
    return sendSalePending(this.client, this.mode, this.deviceId, this.userId, saleData)
  }

  sendLocalMutation(type: Parameters<typeof sendLocalMutation>[4], payload: unknown): string {
    return sendLocalMutation(this.client, this.mode, this.deviceId, this.userId, type, payload)
  }

  private startTickInterval(): void {
    if (this.tickInterval) return
    this.tickInterval = setInterval(() => tickPrimaryCoordinator(), 1_000)
  }

  private stopTickInterval(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null }
  }

  getAuthorityStatus(): AuthorityStatus { return getCanonicalAuthorityStatus() }
}

export const syncService = new SyncService()
