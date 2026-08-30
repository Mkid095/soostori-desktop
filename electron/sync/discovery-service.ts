import dgram from 'dgram'
import { EventEmitter } from 'events'
import os from 'os'
import log from 'electron-log'
import {
  DISCOVERY_PORT, DISCOVERY_MAGIC, DISCOVERY_VERSION,
  type DiscoveryAdvert, type DiscoveryRequest, type DiscoveryMessage,
} from './types'

interface DiscoveryOptions {
  shopId: string
  shopName: string
  deviceId: string
  deviceName: string
  deviceType: 'desktop' | 'mobile'
  isHost: boolean
  wsPort: number
  employeeId: string
  employeeName: string
  appVersion: string
}

export class DiscoveryService extends EventEmitter {
  private socket: dgram.Socket | null = null
  private opts: DiscoveryOptions
  private interval: ReturnType<typeof setInterval> | null = null
  private isAdvertising = false

  constructor(opts: DiscoveryOptions) {
    super()
    this.opts = opts
  }

  start(): void {
    if (this.isAdvertising) return
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      this.socket.bind(DISCOVERY_PORT, () => {
        this.socket?.setBroadcast(true)
        log.info(`Discovery: listening on port ${DISCOVERY_PORT}`)
      })
      this.socket.on('message', (buf, rinfo) => this.handleMessage(buf, rinfo))
      this.socket.on('error', err => log.warn(`Discovery socket error: ${err.message}`))
      // Broadcast advertisement every 5 seconds
      this.interval = setInterval(() => this.broadcastAdvert(), 5000)
      this.broadcastAdvert()
      this.isAdvertising = true
    } catch (err) {
      log.error('Discovery: failed to start', err)
    }
  }

  stop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
    this.socket?.close()
    this.socket = null
    this.isAdvertising = false
    log.info('Discovery: stopped')
  }

  private getLocalIps(): string[] {
    const ips: string[] = []
    const nets = os.networkInterfaces()
    for (const addrs of Object.values(nets)) {
      for (const addr of addrs ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
      }
    }
    return ips
  }

  private broadcastAdvert(): void {
    if (!this.socket) return
    const advert: DiscoveryAdvert = {
      magic: DISCOVERY_MAGIC,
      version: DISCOVERY_VERSION,
      shopId: this.opts.shopId,
      shopName: this.opts.shopName,
      deviceId: this.opts.deviceId,
      deviceName: this.opts.deviceName,
      deviceType: this.opts.deviceType,
      isHost: this.opts.isHost,
      wsPort: this.opts.wsPort,
      employeeId: this.opts.employeeId,
      employeeName: this.opts.employeeName,
      appVersion: this.opts.appVersion,
    }
    const msg = Buffer.from(JSON.stringify(advert))
    for (const ip of this.getLocalIps()) {
      // Broadcast to the subnet
      const parts = ip.split('.')
      const broadcast = `${parts[0]}.${parts[1]}.${parts[2]}.255`
      this.socket.send(msg, DISCOVERY_PORT, broadcast, err => {
        if (err) log.warn(`Discovery: broadcast error to ${broadcast}: ${err.message}`)
      })
    }
  }

  private handleMessage(buf: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const msg: DiscoveryMessage = JSON.parse(buf.toString())
      if (msg.magic !== DISCOVERY_MAGIC || msg.version !== DISCOVERY_VERSION) return
      if (this.opts.isHost && this.isDiscoverRequest(msg)) {
        // Respond with our advertisement
        this.broadcastAdvert()
      }
      if (this.isAdvert(msg) && !this.isOwnAdvert(msg)) {
        this.emit('host discovered', msg as DiscoveryAdvert)
      }
    } catch { /* ignore malformed */ }
  }

  private isAdvert(msg: DiscoveryMessage): msg is DiscoveryAdvert {
    return 'deviceId' in msg && 'wsPort' in msg
  }

  private isDiscoverRequest(msg: DiscoveryMessage): msg is DiscoveryRequest {
    return 'clientDeviceId' in msg
  }

  private isOwnAdvert(msg: DiscoveryMessage): boolean {
    return this.isAdvert(msg) && msg.deviceId === this.opts.deviceId
  }
}
