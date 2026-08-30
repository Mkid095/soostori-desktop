import WebSocket from 'ws'
import type { SyncEvent, SyncMessage, ClientMessageType } from './types'

type ConnectionState = 'connected' | 'connecting' | 'disconnected'

interface GetEventsResponse {
  type: 'GET_EVENTS_AFTER'
  payload: SyncEvent[]
}

export class SyncClient {
  private ws: WebSocket | null = null
  private onMessageCallback: (event: SyncEvent) => void
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private lastProcessedSeq = 0
  private hostUrl: string = ''
  private deviceToken: string = ''
  private _connectionState: ConnectionState = 'disconnected'

  constructor(onMessage: (event: SyncEvent) => void) {
    this.onMessageCallback = onMessage
    this.loadLastSeq()
  }

  private loadLastSeq(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSyncStore } = require('../services/store')
      const store = getSyncStore()
      this.lastProcessedSeq = (store.get('lastProcessedSeq') as number) ?? 0
    } catch {
      this.lastProcessedSeq = 0
    }
  }

  private saveLastSeq(seq: number): void {
    this.lastProcessedSeq = seq
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSyncStore } = require('../services/store')
      const store = getSyncStore()
      store.set('lastProcessedSeq', seq)
    } catch {
      // store not available
    }
  }

  get connectionState(): ConnectionState {
    return this._connectionState
  }

  connect(wsUrl: string, deviceToken: string = ''): void {
    if (this.ws) {
      this.ws.close()
    }
    this.hostUrl = wsUrl
    this.deviceToken = deviceToken
    this._connectionState = 'connecting'

    const url = deviceToken ? `${wsUrl}?token=${encodeURIComponent(deviceToken)}` : wsUrl
    this.ws = new WebSocket(url)

    this.ws.on('open', () => {
      this._connectionState = 'connected'
      this.reconnectDelay = 1000
      const msg: SyncMessage = {
        type: 'GET_EVENTS_AFTER',
        payload: null,
        sequenceNumber: this.lastProcessedSeq,
      }
      this.ws?.send(JSON.stringify(msg))
    })

    this.ws.on('message', (data: Buffer) => {
      try {
        const raw = JSON.parse(data.toString())
        if (this.isGetEventsResponse(raw)) {
          for (const event of raw.payload) {
            this.onMessageCallback(event)
            if (event.sequenceNumber !== undefined && event.sequenceNumber > this.lastProcessedSeq) {
              this.saveLastSeq(event.sequenceNumber)
            }
          }
        } else if (this.isSyncEvent(raw)) {
          this.onMessageCallback(raw)
          if (raw.sequenceNumber !== undefined && raw.sequenceNumber > this.lastProcessedSeq) {
            this.saveLastSeq(raw.sequenceNumber)
          }
        }
      } catch {
        // ignore malformed
      }
    })

    this.ws.on('close', () => {
      this._connectionState = 'disconnected'
      this.scheduleReconnect()
    })

    this.ws.on('error', () => {
      this._connectionState = 'disconnected'
    })
  }

  private isSyncEvent(obj: unknown): obj is SyncEvent {
    return typeof obj === 'object' && obj !== null && 'eventType' in obj
  }

  private isGetEventsResponse(obj: unknown): obj is GetEventsResponse {
    return typeof obj === 'object' && obj !== null && 'type' in obj && (obj as GetEventsResponse).type === 'GET_EVENTS_AFTER'
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.hostUrl) {
        this.connect(this.hostUrl)
      }
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  send(msg: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.hostUrl = ''
    this.ws?.close()
    this.ws = null
    this._connectionState = 'disconnected'
  }
}
