import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import type { SyncEvent } from './types'
import { handleMessage, createEvent, type ServerState } from './server-handlers'
import { getDatabase } from '../database'
import log from 'electron-log'

interface ClientInfo {
  deviceId: string
  userId: string
  lastSeq: number
}

export class SyncServer {
  private wss: WebSocketServer | null = null
  private clients: Map<WebSocket, ClientInfo> = new Map()
  private _state: ServerState

  constructor(deviceId: string, userId: string, shopId: string) {
    this._state = { deviceId, userId, shopId, sequenceNumber: 0 }
  }

  start(port: number): void {
    this.wss = new WebSocketServer({ port })

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Validate connection token from query string
      const url = new URL(req.url ?? '/', `http://localhost`)
      const token = url.searchParams.get('token')
      if (!this.validateToken(token)) {
        log.warn(`WebSocket connection rejected: invalid token`)
        ws.close(4001, 'Unauthorized')
        return
      }

      const clientId = uuidv4()
      this.clients.set(ws, { deviceId: clientId, userId: '', lastSeq: 0 })

      const onlineEvent = createEvent('DEVICE_ONLINE', { deviceId: clientId }, this._state)
      this._state.sequenceNumber++
      this.broadcast(onlineEvent, ws)

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString())
          handleMessage(ws, msg, this._state, this.clients, this.broadcast.bind(this))
        } catch {
          // ignore malformed
        }
      })

      ws.on('close', () => {
        const info = this.clients.get(ws)
        if (info) {
          const offlineEvent = createEvent('DEVICE_OFFLINE', { deviceId: info.deviceId }, this._state)
          this._state.sequenceNumber++
          this.broadcast(offlineEvent)
        }
        this.clients.delete(ws)
      })
    })
  }

  private validateToken(token: string | null): boolean {
    if (!token) return false
    const db = getDatabase()
    const row = db.prepare(
      'SELECT id FROM devices WHERE connection_token = ? AND is_host = 0'
    ).get(token)
    return !!row
  }

  broadcast(event: SyncEvent, excludeClient?: WebSocket): void {
    const data = JSON.stringify(event)
    for (const [ws] of this.clients) {
      if (ws !== excludeClient && ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    }
  }

  getLocalIp(): string {
    const nets = require('os').networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address
      }
    }
    return '127.0.0.1'
  }

  stop(): void {
    this.wss?.close()
    this.wss = null
    this.clients.clear()
  }
}
