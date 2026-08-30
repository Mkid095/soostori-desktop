import { v4 as uuidv4 } from 'uuid'
import type { SyncEvent, SyncMessage, ClientMessageType, DiscoveryAdvert } from './types'
import { SyncServer } from './server'
import { SyncClient } from './client'
import { DiscoveryService } from './discovery-service'
import { dispatchSyncStatus } from './sync-service-core'
import { sendSalePending, sendLocalMutation } from './sync-service-messages'
import log from 'electron-log'

type SyncEventCallback = (event: SyncEvent) => void
type HostDiscoveredCallback = (advert: DiscoveryAdvert) => void

class SyncService {
  private server: SyncServer | null = null
  private client: SyncClient | null = null
  private discovery: DiscoveryService | null = null
  private eventListeners: Set<SyncEventCallback> = new Set()
  private hostListeners: Set<HostDiscoveredCallback> = new Set()
  private deviceId: string = ''
  private userId: string = ''
  private shopId: string = ''
  private shopName: string = ''
  private deviceName: string = ''
  private wsPort: number = 18792
  private mode: 'host' | 'client' | 'offline' = 'offline'

  configure(opts: {
    deviceId: string
    userId: string
    shopId: string
    shopName: string
    deviceName: string
    deviceType: 'desktop' | 'mobile'
    employeeId: string
    employeeName: string
    appVersion: string
    wsPort?: number
  }): void {
    this.deviceId = opts.deviceId
    this.userId = opts.userId
    this.shopId = opts.shopId
    this.wsPort = opts.wsPort ?? 18792
    this.shopName = opts.shopName
    this.deviceName = opts.deviceName

    this.discovery = new DiscoveryService({
      shopId: opts.shopId,
      shopName: opts.shopName,
      deviceId: opts.deviceId,
      deviceName: opts.deviceName,
      deviceType: opts.deviceType,
      isHost: false,
      wsPort: this.wsPort,
      employeeId: opts.employeeId,
      employeeName: opts.employeeName,
      appVersion: opts.appVersion,
    })

    this.discovery.on('host discovered', (advert: DiscoveryAdvert) => {
      this.hostListeners.forEach(cb => cb(advert))
    })

    this.discovery.start()
    log.info(`Discovery: started for device ${opts.deviceId}`)
  }

  startHost(port?: number): void {
    if (this.mode !== 'offline') this.stop()
    this.mode = 'host'
    const p = port ?? this.wsPort

    if (this.discovery) { this.discovery.stop() }
    this.discovery = new DiscoveryService({
      shopId: this.shopId,
      shopName: this.shopName,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: 'desktop',
      isHost: true,
      wsPort: p,
      employeeId: this.userId,
      employeeName: '',
      appVersion: '',
    })
    this.discovery.on('host discovered', (advert: DiscoveryAdvert) => {
      this.hostListeners.forEach(cb => cb(advert))
    })
    this.discovery.start()

    this.server = new SyncServer(this.deviceId, this.userId, this.shopId)
    this.server.start(p)
    log.info(`SyncService: host mode started on port ${p}`)
    dispatchSyncStatus('online')
  }

  startClient(hostUrl: string, deviceToken: string = ''): void {
    if (this.mode !== 'offline') this.stop()
    this.mode = 'client'
    this.client = new SyncClient((event: SyncEvent) => {
      this.eventListeners.forEach(cb => cb(event))
      dispatchSyncStatus('syncing')
      setTimeout(() => dispatchSyncStatus('online'), 500)
    })
    this.client.connect(hostUrl, deviceToken)
    log.info(`SyncService: client mode connecting to ${hostUrl}`)
  }

  stop(): void {
    if (this.server) { this.server.stop(); this.server = null }
    if (this.client) { this.client.disconnect(); this.client = null }
    if (this.discovery) { this.discovery.stop(); this.discovery = null }
    this.mode = 'offline'
    dispatchSyncStatus('offline')
  }

  broadcast(event: SyncEvent, idempotencyKey?: string): void {
    const key = idempotencyKey ?? uuidv4()
    if (this.mode === 'host' && this.server) {
      this.server.broadcast(event)
    } else if (this.mode === 'client' && this.client) {
      const msg: SyncMessage = {
        type: event.eventType as ClientMessageType,
        payload: event.payload,
        deviceId: event.deviceId,
        userId: event.userId,
        sequenceNumber: event.sequenceNumber,
        idempotencyKey: key,
      }
      this.client.send(msg)
    }
  }

  onEvent(callback: SyncEventCallback): () => void {
    this.eventListeners.add(callback)
    return () => this.eventListeners.delete(callback)
  }

  onHostDiscovered(callback: HostDiscoveredCallback): () => void {
    this.hostListeners.add(callback)
    return () => this.hostListeners.delete(callback)
  }

  getMode(): 'host' | 'client' | 'offline' {
    return this.mode
  }

  sendSalePending(saleData: {
    saleId: string
    items: Array<{ productId: string; quantity: number }>
    total: number
    paymentMethod: string
  }): string {
    return sendSalePending(this.client, this.mode, this.deviceId, this.userId, saleData)
  }

  sendLocalMutation(type: Parameters<typeof sendLocalMutation>[4], payload: unknown): string {
    return sendLocalMutation(this.client, this.mode, this.deviceId, this.userId, type, payload)
  }
}

export const syncService = new SyncService()
